"use client";

import { useEffect } from "react";
import { ErrorPage } from "@/components/ui/error-page";

export default function MatrixError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorPage
      title="Failed to load Matrix section"
      message={error.message}
      showRetryButton
      onRetry={reset}
    />
  );
}
