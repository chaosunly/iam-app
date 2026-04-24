import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler, NotFoundError } from "@/lib/errors";
import { requireAdmin } from "@/lib/middleware/auth.middleware";
import {
  getGitlabGroupWithMembers,
  deleteGitlabGroup,
} from "@/lib/services/gitlab.service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandler(async () => {
    await requireAdmin(request);
    const { id } = await params;
    const group = await getGitlabGroupWithMembers(id);
    if (!group) throw new NotFoundError("Group not found");
    return NextResponse.json({ group });
  });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandler(async () => {
    await requireAdmin(request);
    const { id } = await params;
    await deleteGitlabGroup(id);
    return NextResponse.json({ success: true });
  });
}
