import { NextResponse } from "next/server";
import { ApiError, ApiResponse } from "@/lib/types";

// Custom error classes
export class UnauthorizedError extends Error {
  status = 401;
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  status = 403;
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends Error {
  status = 404;
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class BadRequestError extends Error {
  status = 400;
  constructor(message = "Bad request") {
    super(message);
    this.name = "BadRequestError";
  }
}

export class InternalServerError extends Error {
  status = 500;
  constructor(message = "Internal server error") {
    super(message);
    this.name = "InternalServerError";
  }
}

// Error response builder
export function createErrorResponse(
  error: unknown,
  defaultMessage = "An error occurred"
): NextResponse<ApiError> {
  console.error("API Error:", error);

  if (error instanceof UnauthorizedError) {
    return NextResponse.json(
      {
        error: error.message,
        status: error.status,
      },
      { status: error.status }
    );
  }

  if (error instanceof ForbiddenError) {
    return NextResponse.json(
      {
        error: error.message,
        status: error.status,
      },
      { status: error.status }
    );
  }

  if (error instanceof NotFoundError) {
    return NextResponse.json(
      {
        error: error.message,
        status: error.status,
      },
      { status: error.status }
    );
  }

  if (error instanceof BadRequestError) {
    return NextResponse.json(
      {
        error: error.message,
        status: error.status,
      },
      { status: error.status }
    );
  }

  if (error instanceof Error) {
    return NextResponse.json(
      {
        error: error.message || defaultMessage,
        status: 500,
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      error: defaultMessage,
      status: 500,
    },
    { status: 500 }
  );
}

// Success response builder
export function createSuccessResponse<T>(
  data: T,
  status = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      data,
      status,
    },
    { status }
  );
}

// Generic API handler wrapper with error catching
export function withErrorHandler<T = unknown>(
  handler: () => Promise<NextResponse<T>>
): Promise<NextResponse<T | ApiError>> {
  return handler().catch((error) => createErrorResponse(error));
}
