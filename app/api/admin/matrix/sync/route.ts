import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler, BadRequestError } from "@/lib/errors";
import { requireAdmin } from "@/lib/middleware/auth.middleware";
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

export async function POST(request: NextRequest) {
  return withErrorHandler(async () => {
    const userContext = await requireAdmin(request);
    const phase = request.nextUrl.searchParams.get("phase") ?? "db";

    if (!["db", "homeserver", "all"].includes(phase)) {
      throw new BadRequestError("phase must be one of: db, homeserver, all");
    }

    const response: Record<string, unknown> = { phase };

    if (phase === "db" || phase === "all") {
      const dbResult: DbSyncResult = {
        orgs: { synced: 0, skipped: 0, failed: [] },
        groups: { synced: 0, skipped: 0, failed: [] },
        accounts: { synced: 0, skipped: 0, failed: [] },
      };

      // Purge MatrixRoom records and their role assignments where the linked IAM
      // group no longer exists (orphans from deletions before cleanup hooks existed).
      const orphanRooms = await prisma.matrixRoom.findMany({
        where: { iamGroupId: { not: null } },
        select: { id: true, iamGroupId: true },
      });
      for (const room of orphanRooms) {
        const groupExists = await prisma.group.findUnique({ where: { id: room.iamGroupId! } });
        if (!groupExists) {
          await prisma.matrixRoleAssignment.deleteMany({ where: { resourceType: "room", resourceId: room.id } }).catch(() => {});
          await prisma.matrixRoom.delete({ where: { id: room.id } }).catch(() => {});
        }
      }

      // Purge MatrixRoleAssignment records for rooms whose group member list no
      // longer contains that user (removed from group without cleanup).
      const allRoomAssignments = await prisma.matrixRoleAssignment.findMany({
        where: { resourceType: "room" },
        select: { id: true, userId: true, resourceId: true, role: true },
      });
      for (const a of allRoomAssignments) {
        const room = await prisma.matrixRoom.findUnique({ where: { id: a.resourceId } });
        if (!room?.iamGroupId) continue;
        const members = await getGroupMembers(room.iamGroupId);
        if (!members.includes(a.userId)) {
          await prisma.matrixRoleAssignment.delete({ where: { id: a.id } }).catch(() => {});
        }
      }

      const orgs = await prisma.organization.findMany();
      for (const org of orgs) {
        try {
          const existing = await prisma.matrixOrg.findFirst({ where: { iamOrgId: org.id } });
          if (existing) { dbResult.orgs.skipped++; continue; }
          await bootstrapMatrixOrgDb(org.id, org.name);
          dbResult.orgs.synced++;
        } catch (err) {
          console.error(`[MatrixSync] Org DB failed: ${org.id}`, err);
          dbResult.orgs.failed.push(org.id);
        }
      }

      const groups = await prisma.group.findMany();
      for (const group of groups) {
        try {
          const existing = await prisma.matrixRoom.findFirst({ where: { iamGroupId: group.id } });
          if (existing) { dbResult.groups.skipped++; continue; }
          await bootstrapGroupRoomDb(group.id, group.name, group.organizationId);
          const created = await prisma.matrixRoom.findFirst({ where: { iamGroupId: group.id } });
          if (created) dbResult.groups.synced++;
          else dbResult.groups.skipped++;
        } catch (err) {
          console.error(`[MatrixSync] Group DB failed: ${group.id}`, err);
          dbResult.groups.failed.push(group.id);
        }
      }

      let allIdentities: { id: string }[] = [];
      try {
        allIdentities = await listIdentities(0, 1000);
      } catch (err) {
        console.error("[MatrixSync] Failed to list Kratos identities", err);
      }

      for (const identity of allIdentities) {
        try {
          const existing = await prisma.matrixAccount.findUnique({ where: { iamUserId: identity.id } });
          if (existing) { dbResult.accounts.skipped++; continue; }
          await provisionMatrixAccountDb(identity.id);
          dbResult.accounts.synced++;
        } catch (err) {
          console.error(`[MatrixSync] Account DB failed: ${identity.id}`, err);
          dbResult.accounts.failed.push(identity.id);
        }
      }

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
      if (phase === "all") (response as any)._groupMemberships = groupMemberships;
    }

    if (phase === "homeserver" || phase === "all") {
      const hsConfigured = !!(
        process.env.MATRIX_HOMESERVER_URL &&
        process.env.MATRIX_SERVER_NAME &&
        (process.env.MATRIX_AS_TOKEN || process.env.MATRIX_ADMIN_TOKEN)
      );

      if (!hsConfigured) {
        response.homeserver = {
          error: "Synapse not configured. Set MATRIX_HOMESERVER_URL, MATRIX_ADMIN_TOKEN, MATRIX_SERVER_NAME.",
        };
      } else {
        const hsResult = await syncToHomeserver();
        response.homeserver = hsResult;

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

      delete (response as any)._groupMemberships;
    }

    await logAudit({
      userId: userContext.userId,
      action: "matrix_sync",
      resource: `Organization:${getDefaultOrganizationId()}`,
      result: "success",
      metadata: { phase, ...response },
    });

    return NextResponse.json({ result: response });
  });
}
