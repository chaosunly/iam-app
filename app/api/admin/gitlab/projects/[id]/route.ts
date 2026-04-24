import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler, NotFoundError } from "@/lib/errors";
import { requireAdmin } from "@/lib/middleware/auth.middleware";
import {
  getGitlabProjectWithMembers,
  deleteGitlabProject,
} from "@/lib/services/gitlab.service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandler(async () => {
    await requireAdmin(request);
    const { id } = await params;
    const project = await getGitlabProjectWithMembers(id);
    if (!project) throw new NotFoundError("Project not found");
    return NextResponse.json({ project });
  });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandler(async () => {
    await requireAdmin(request);
    const { id } = await params;
    await deleteGitlabProject(id);
    return NextResponse.json({ success: true });
  });
}
