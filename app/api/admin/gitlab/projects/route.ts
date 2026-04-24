import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandler } from "@/lib/errors";
import { requireAdmin } from "@/lib/middleware/auth.middleware";
import { validateBody } from "@/lib/middleware/validate";
import {
  getGitlabProjects,
  createGitlabProject,
} from "@/lib/services/gitlab.service";

const createGitlabProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  groupId: z.string().optional(),
});

export async function GET(_req: NextRequest) {
  return withErrorHandler(async () => {
    await requireAdmin(_req);
    const projects = await getGitlabProjects();
    return NextResponse.json({ projects });
  });
}

export async function POST(request: NextRequest) {
  return withErrorHandler(async () => {
    await requireAdmin(request);
    const body = await validateBody(request, createGitlabProjectSchema);
    const project = await createGitlabProject(body);
    return NextResponse.json({ project }, { status: 201 });
  });
}
