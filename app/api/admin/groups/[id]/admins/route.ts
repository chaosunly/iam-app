import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";
import {
  canAccessAdmin,
  invalidateUserCache,
} from "@/lib/services/permission.service";
import { getGroupById } from "@/lib/services/group.service";
import { getIdentity } from "@/lib/services/kratos.service";
import {
  grantPermission,
  revokePermission,
  listObjectPermissions,
} from "@/lib/services/keto.service";

/**
 * GET /api/admin/groups/[id]/admins
 * List all admins of a group
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession();
    if (!session?.identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.identity.id;
    if (!(await canAccessAdmin(userId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: groupId } = await params;

    if (!(await getGroupById(groupId))) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const tuples = await listObjectPermissions("Group", groupId);
    const adminTuples = tuples.filter((t) => t.relation === "admins");

    const admins = await Promise.all(
      adminTuples.map(async (t) => {
        try {
          const identity = await getIdentity(t.subject);
          return {
            userId: t.subject,
            email: identity.traits.email || "",
            name: identity.traits.name
              ? `${identity.traits.name.first || ""} ${identity.traits.name.last || ""}`.trim()
              : identity.traits.email || t.subject,
          };
        } catch {
          return { userId: t.subject, email: "", name: t.subject };
        }
      }),
    );

    return NextResponse.json({ admins });
  } catch (error) {
    console.error("Error fetching group admins:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/groups/[id]/admins
 * Grant a user admin role on a group
 * Body: { userId: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession();
    if (!session?.identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.identity.id;
    if (!(await canAccessAdmin(userId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: groupId } = await params;

    if (!(await getGroupById(groupId))) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const body = await request.json();
    const { userId: targetUserId } = body;

    if (!targetUserId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    await grantPermission({
      namespace: "Group",
      object: groupId,
      relation: "admins",
      subject: targetUserId,
    });

    invalidateUserCache(targetUserId);

    return NextResponse.json(
      { message: "Group admin granted successfully" },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error granting group admin:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/groups/[id]/admins
 * Revoke a user's admin role on a group
 * Body: { userId: string }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession();
    if (!session?.identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.identity.id;
    if (!(await canAccessAdmin(userId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: groupId } = await params;
    const body = await request.json();
    const { userId: targetUserId } = body;

    if (!targetUserId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    await revokePermission({
      namespace: "Group",
      object: groupId,
      relation: "admins",
      subject: targetUserId,
    });

    invalidateUserCache(targetUserId);

    return NextResponse.json({ message: "Group admin revoked successfully" });
  } catch (error) {
    console.error("Error revoking group admin:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
