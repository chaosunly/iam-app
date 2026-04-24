import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandler } from "@/lib/errors";
import { requireAdmin } from "@/lib/middleware/auth.middleware";
import { validateBody } from "@/lib/middleware/validate";
import {
  getGitlabGroups,
  createGitlabGroup,
} from "@/lib/services/gitlab.service";

const createGitlabGroupSchema = z.object({
  name: z.string().min(1, "Group name is required"),
  description: z.string().optional(),
});

export async function GET(_req: NextRequest) {
  return withErrorHandler(async () => {
    await requireAdmin(_req);
    const groups = await getGitlabGroups();
    return NextResponse.json({ groups });
  });
}

export async function POST(request: NextRequest) {
  return withErrorHandler(async () => {
    await requireAdmin(request);
    const body = await validateBody(request, createGitlabGroupSchema);
    const group = await createGitlabGroup(body);
    return NextResponse.json({ group }, { status: 201 });
  });
}
