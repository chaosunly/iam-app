import { NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";
import { isGlobalAdmin } from "@/lib/services/permission.service";
import { logAudit } from "@/lib/services/audit.service";
import { prisma } from "@/lib/db";
import { getDefaultOrganizationId } from "@/lib/services/organization.service";
import { getGroupMembers } from "@/lib/services/group.service";
import { getIdentity } from "@/lib/services/kratos.service";
import {
  bootstrapMatrixOrg,
  bootstrapGroupRoom,
  provisionMatrixAccount,
  syncGroupRoomJoin,
} from "@/lib/services/matrix-provision.service";

interface SyncResult {
  orgs: { synced: number; skipped: number; failed: string[] };
  groups: { synced: number; skipped: number; failed: string[] };
  accounts: { synced: number; skipped: number; failed: string[] };
  memberships: { synced: number; skipped: number; failed: string[] };
}

/**
 * POST /api/admin/matrix/sync
 *
 * One-time sync: provisions Matrix entities for all existing IAM orgs,
 * groups, users, and group memberships. Every step is idempotent — safe
 * to call multiple times.
 */
export async function POST() {
  try {
    const session = await getServerSession();
    if (!session?.identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const actorId = session.identity.id;
    if (!(await isGlobalAdmin(actorId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (process.env.MATRIX_PROVISION_ENABLED !== "true") {
      return NextResponse.json(
        { error: "MATRIX_PROVISION_ENABLED is not set to true" },
        { status: 400 },
      );
    }

    const result: SyncResult = {
      orgs: { synced: 0, skipped: 0, failed: [] },
      groups: { synced: 0, skipped: 0, failed: [] },
      accounts: { synced: 0, skipped: 0, failed: [] },
      memberships: { synced: 0, skipped: 0, failed: [] },
    };

    // ── 1. Sync organizations → Matrix orgs + default space + #general room ──

    const orgs = await prisma.organization.findMany();

    for (const org of orgs) {
      try {
        const existing = await prisma.matrixOrg.findFirst({
          where: { iamOrgId: org.id },
        });
        if (existing) {
          result.orgs.skipped++;
          continue;
        }
        await bootstrapMatrixOrg(org.id, org.name);
        result.orgs.synced++;
      } catch (err) {
        console.error(`[MatrixSync] Org failed: ${org.id}`, err);
        result.orgs.failed.push(org.id);
      }
    }

    // ── 2. Sync groups → Matrix rooms ────────────────────────────────────────

    const groups = await prisma.group.findMany();

    for (const group of groups) {
      try {
        const existing = await prisma.matrixRoom.findFirst({
          where: { iamGroupId: group.id },
        });
        if (existing) {
          result.groups.skipped++;
          continue;
        }
        await bootstrapGroupRoom(group.id, group.name, group.organizationId);
        result.groups.synced++;
      } catch (err) {
        console.error(`[MatrixSync] Group failed: ${group.id}`, err);
        result.groups.failed.push(group.id);
      }
    }

    // ── 3. Collect all unique member IDs across groups ───────────────────────

    const allMemberIds = new Set<string>();
    const groupMemberships: { groupId: string; memberIds: string[] }[] = [];

    for (const group of groups) {
      try {
        const memberIds = await getGroupMembers(group.id);
        groupMemberships.push({ groupId: group.id, memberIds });
        for (const id of memberIds) allMemberIds.add(id);
      } catch (err) {
        console.error(`[MatrixSync] Failed to list members for group ${group.id}`, err);
      }
    }

    // ── 4. Provision Matrix accounts for all members ─────────────────────────

    for (const userId of allMemberIds) {
      try {
        const existing = await prisma.matrixAccount.findUnique({
          where: { iamUserId: userId },
        });
        if (existing) {
          result.accounts.skipped++;
          continue;
        }

        let displayName = userId;
        try {
          const identity = await getIdentity(userId);
          const first = identity.traits?.name?.first || "";
          const last = identity.traits?.name?.last || "";
          displayName = `${first} ${last}`.trim() || identity.traits?.email || userId;
        } catch {
          // Fall back to userId as display name
        }

        await provisionMatrixAccount(userId, displayName);
        result.accounts.synced++;
      } catch (err) {
        console.error(`[MatrixSync] Account failed: ${userId}`, err);
        result.accounts.failed.push(userId);
      }
    }

    // ── 5. Sync group memberships → Matrix room joins ────────────────────────

    for (const { groupId, memberIds } of groupMemberships) {
      for (const userId of memberIds) {
        try {
          const [room, account] = await Promise.all([
            prisma.matrixRoom.findFirst({ where: { iamGroupId: groupId } }),
            prisma.matrixAccount.findUnique({ where: { iamUserId: userId } }),
          ]);

          if (!room?.matrixId || !account) {
            result.memberships.skipped++;
            continue;
          }

          await syncGroupRoomJoin(groupId, userId, "member");
          result.memberships.synced++;
        } catch (err) {
          console.error(`[MatrixSync] Membership failed: ${groupId}/${userId}`, err);
          result.memberships.failed.push(`${groupId}/${userId}`);
        }
      }
    }

    // ── 6. Audit log ─────────────────────────────────────────────────────────

    await logAudit({
      userId: actorId,
      action: "matrix_full_sync",
      resource: `Organization:${getDefaultOrganizationId()}`,
      result: "success",
      metadata: {
        orgs: { synced: result.orgs.synced, skipped: result.orgs.skipped, failed: result.orgs.failed.length },
        groups: { synced: result.groups.synced, skipped: result.groups.skipped, failed: result.groups.failed.length },
        accounts: { synced: result.accounts.synced, skipped: result.accounts.skipped, failed: result.accounts.failed.length },
        memberships: { synced: result.memberships.synced, skipped: result.memberships.skipped, failed: result.memberships.failed.length },
      },
    });

    return NextResponse.json({ result });
  } catch (error: any) {
    console.error("[MatrixSync] Sync failed:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
