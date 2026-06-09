import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/errors";
import { requireAdmin } from "@/lib/middleware/auth.middleware";
import { proxyTalosAdminRequest } from "@/lib/services";

async function handleProxy(
  request: NextRequest,
  params: Promise<{ path: string[] }>,
) {
  await requireAdmin(request);

  const resolved = await params;
  const path = `/${(resolved.path || []).join("/")}`;
  const search = request.nextUrl.search || "";

  const contentType = request.headers.get("content-type") || undefined;
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const body = hasBody ? await request.text() : undefined;

  const result = await proxyTalosAdminRequest(path, search, {
    method: request.method,
    headers: contentType ? { "Content-Type": contentType } : undefined,
    body,
    cache: "no-store",
  });

  return new NextResponse(result.body, {
    status: result.status,
    headers: {
      "content-type": result.contentType,
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return withErrorHandler(() => handleProxy(request, params));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return withErrorHandler(() => handleProxy(request, params));
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return withErrorHandler(() => handleProxy(request, params));
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return withErrorHandler(() => handleProxy(request, params));
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return withErrorHandler(() => handleProxy(request, params));
}
