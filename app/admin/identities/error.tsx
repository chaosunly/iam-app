"use client";

import { useEffect } from "react";
import { ErrorPage } from "@/components/ui/error-page";

export default function IdentitiesError({
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
      title="Failed to load identities"
      message={error.message}
      showRetryButton
      onRetry={reset}
    />
  );
}
