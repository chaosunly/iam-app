"use client";

import { useEffect } from "react";
import { ErrorPage } from "@/components/ui/error-page";

export default function GlobalError({
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
      title="Something went wrong"
      message={error.message}
      showRetryButton
      onRetry={reset}
      showHomeButton
    />
  );
}
