import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "@ory/nextjs/app";
import { canAccessAdmin, invalidateUserCache } from "@/lib/services/permission.service";
import { withErrorHandler, UnauthorizedError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { validateBody } from "@/lib/middleware/validate";
import { getGroupById } from "@/lib/services/group.service";
import { getIdentity } from "@/lib/services/kratos.service";
import {
  grantPermission,
  revokePermission,
  listObjectPermissions,
} from "@/lib/services/keto.service";

const adminUserSchema = z.object({
  userId: z.string().min(1, "userId is required"),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandler(async () => {
    const session = await getServerSession();
    if (!session?.identity) throw new UnauthorizedError();
    if (!(await canAccessAdmin(session.identity.id))) throw new ForbiddenError();

    const { id: groupId } = await params;
    if (!(await getGroupById(groupId))) throw new NotFoundError("Group not found");

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
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandler(async () => {
    const session = await getServerSession();
    if (!session?.identity) throw new UnauthorizedError();
    if (!(await canAccessAdmin(session.identity.id))) throw new ForbiddenError();

    const { id: groupId } = await params;
    if (!(await getGroupById(groupId))) throw new NotFoundError("Group not found");

    const body = await validateBody(request, adminUserSchema);
    await grantPermission({ namespace: "Group", object: groupId, relation: "admins", subject: body.userId });
    invalidateUserCache(body.userId);
    return NextResponse.json({ message: "Group admin granted successfully" }, { status: 201 });
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandler(async () => {
    const session = await getServerSession();
    if (!session?.identity) throw new UnauthorizedError();
    if (!(await canAccessAdmin(session.identity.id))) throw new ForbiddenError();

    const { id: groupId } = await params;
    const body = await request.json();
    const { userId: targetUserId } = body;

    await revokePermission({ namespace: "Group", object: groupId, relation: "admins", subject: targetUserId });
    invalidateUserCache(targetUserId);
    return NextResponse.json({ message: "Group admin revoked successfully" });
  });
}
