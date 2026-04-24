import { NextRequest } from "next/server";
import { ZodType } from "zod";
import { BadRequestError } from "@/lib/errors";

export async function validateBody<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new BadRequestError("Invalid JSON body");
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    const firstError = result.error.issues[0];
    throw new BadRequestError(firstError?.message ?? "Invalid request body");
  }

  return result.data;
}
