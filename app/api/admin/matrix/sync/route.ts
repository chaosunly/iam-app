import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";
import { isGlobalAdmin } from "@/lib/services/permission.service";
import { logAudit } from "@/lib/services/audit.service";
import { prisma } from "@/lib/db";
import { getDefaultOrganizationId } from "@/lib/services/organization.service";
import { getGroupMembers, getGroupAdmins } from "@/lib/services/group.service";
import { listIdentities } from "@/lib/services/kratos.service";
import {
  bootstrapMatrixOrgDb,
  bootstrapGroupRoomDb,
  provisionMatrixAccountDb,
  syncToHomeserver,
  syncGroupRoomJoin,
} from "@/lib/services/matrix-provision.service";

interface DbSyncResult {
  orgs: { synced: number; skipped: number; failed: string[] };
  groups: { synced: number; skipped: number; failed: string[] };
  accounts: { synced: number; skipped: number; failed: string[] };
}

/**
 * POST /api/admin/matrix/sync?phase=db|homeserver|all
 *
 * Two-phase sync:
 *   phase=db          (default) — Populates Matrix DB tables from IAM data.
 *                                 No Synapse needed.
 *   phase=homeserver  — Reads from Matrix tables, creates rooms/accounts on
 *                       Synapse, backfills matrixId. Requires Synapse config.
 *   phase=all         — Runs both phases + membership sync.
 *
 * Every step is idempotent — safe to call multiple times.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const actorId = session.identity.id;
    if (!(await isGlobalAdmin(actorId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const phase = request.nextUrl.searchParams.get("phase") ?? "db";

    if (!["db", "homeserver", "all"].includes(phase)) {
      return NextResponse.json(
        { error: "phase must be one of: db, homeserver, all" },
        { status: 400 },
      );
    }

    const response: Record<string, unknown> = { phase };

    // ── Phase 1: DB provisioning ─────────────────────────────────────────────

    if (phase === "db" || phase === "all") {
      const dbResult: DbSyncResult = {
        orgs: { synced: 0, skipped: 0, failed: [] },
        groups: { synced: 0, skipped: 0, failed: [] },
        accounts: { synced: 0, skipped: 0, failed: [] },
      };

      // 1a. Sync orgs → MatrixOrg + MatrixSpace + MatrixRoom (DB only)
      const orgs = await prisma.organization.findMany();
      for (const org of orgs) {
        try {
          const existing = await prisma.matrixOrg.findFirst({
            where: { iamOrgId: org.id },
          });
          if (existing) {
            dbResult.orgs.skipped++;
            continue;
          }
          await bootstrapMatrixOrgDb(org.id, org.name);
          dbResult.orgs.synced++;
        } catch (err) {
          console.error(`[MatrixSync] Org DB failed: ${org.id}`, err);
          dbResult.orgs.failed.push(org.id);
        }
      }

      // 1b. Sync groups → MatrixRoom (DB only)
      const groups = await prisma.group.findMany();
      for (const group of groups) {
        try {
          const existing = await prisma.matrixRoom.findFirst({
            where: { iamGroupId: group.id },
          });
          if (existing) {
            dbResult.groups.skipped++;
            continue;
          }
          await bootstrapGroupRoomDb(group.id, group.name, group.organizationId);
          const created = await prisma.matrixRoom.findFirst({
            where: { iamGroupId: group.id },
          });
          if (created) {
            dbResult.groups.synced++;
          } else {
            dbResult.groups.skipped++;
          }
        } catch (err) {
          console.error(`[MatrixSync] Group DB failed: ${group.id}`, err);
          dbResult.groups.failed.push(group.id);
        }
      }

      // 1c. Provision MatrixAccount for every Kratos identity
      let allIdentities: { id: string }[] = [];
      try {
        allIdentities = await listIdentities(0, 1000);
      } catch (err) {
        console.error("[MatrixSync] Failed to list Kratos identities", err);
      }

      for (const identity of allIdentities) {
        try {
          const existing = await prisma.matrixAccount.findUnique({
            where: { iamUserId: identity.id },
          });
          if (existing) {
            dbResult.accounts.skipped++;
            continue;
          }
          await provisionMatrixAccountDb(identity.id);
          dbResult.accounts.synced++;
        } catch (err) {
          console.error(`[MatrixSync] Account DB failed: ${identity.id}`, err);
          dbResult.accounts.failed.push(identity.id);
        }
      }

      // 1d. Collect group members + admins for membership sync (phase=all)
      const groupMemberships: {
        groupId: string;
        members: { userId: string; role: "member" | "moderator" }[];
      }[] = [];

      for (const group of groups) {
        try {
          const [memberIds, adminIds] = await Promise.all([
            getGroupMembers(group.id),
            getGroupAdmins(group.id),
          ]);
          const members = [
            ...memberIds.map((userId) => ({ userId, role: "member" as const })),
            ...adminIds.map((userId) => ({ userId, role: "moderator" as const })),
          ];
          groupMemberships.push({ groupId: group.id, members });
        } catch (err) {
          console.error(`[MatrixSync] Failed to list members for group ${group.id}`, err);
        }
      }

      response.db = dbResult;

      if (phase === "all") {
        (response as any)._groupMemberships = groupMemberships;
      }
    }

    // ── Phase 2: Homeserver sync ─────────────────────────────────────────────

    if (phase === "homeserver" || phase === "all") {
      const hsConfigured = !!(
        process.env.MATRIX_HOMESERVER_URL &&
        process.env.MATRIX_ADMIN_TOKEN &&
        process.env.MATRIX_SERVER_NAME
      );

      if (!hsConfigured) {
        response.homeserver = {
          error: "Synapse not configured. Set MATRIX_HOMESERVER_URL, MATRIX_ADMIN_TOKEN, MATRIX_SERVER_NAME.",
        };
      } else {
        const hsResult = await syncToHomeserver();
        response.homeserver = hsResult;

        // Membership sync (only when homeserver is available)
        if (phase === "all") {
          const memberships = { synced: 0, skipped: 0, failed: [] as string[] };
          const groupMemberships = (response as any)._groupMemberships as
            | { groupId: string; members: { userId: string; role: "member" | "moderator" }[] }[]
            | undefined;

          if (groupMemberships) {
            for (const { groupId, members } of groupMemberships) {
              for (const { userId, role } of members) {
                try {
                  const [room, account] = await Promise.all([
                    prisma.matrixRoom.findFirst({ where: { iamGroupId: groupId } }),
                    prisma.matrixAccount.findUnique({ where: { iamUserId: userId } }),
                  ]);

                  if (!room?.matrixId || !account || account.homeserver === "pending") {
                    memberships.skipped++;
                    continue;
                  }

                  await syncGroupRoomJoin(groupId, userId, role);
                  memberships.synced++;
                } catch (err) {
                  console.error(`[MatrixSync] Membership failed: ${groupId}/${userId}`, err);
                  memberships.failed.push(`${groupId}/${userId}`);
                }
              }
            }
          }

          response.memberships = memberships;
        }
      }

      // Clean up internal field
      delete (response as any)._groupMemberships;
    }

    // ── Audit log ────────────────────────────────────────────────────────────

    await logAudit({
      userId: actorId,
      action: "matrix_sync",
      resource: `Organization:${getDefaultOrganizationId()}`,
      result: "success",
      metadata: { phase, ...response },
    });

    return NextResponse.json({ result: response });
  } catch (error: any) {
    console.error("[MatrixSync] Sync failed:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
