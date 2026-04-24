"use client";

import { useEffect } from "react";
import { ErrorPage } from "@/components/ui/error-page";

export default function GroupsError({
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
      title="Failed to load groups"
      message={error.message}
      showRetryButton
      onRetry={reset}
    />
  );
}
