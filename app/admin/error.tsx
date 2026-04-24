"use client";

import { useEffect } from "react";
import { ErrorPage } from "@/components/ui/error-page";

export default function AdminError({
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
      title="Admin panel error"
      message={error.message}
      showRetryButton
      onRetry={reset}
      showHomeButton
      homeHref="/admin"
      homeLabel="Go to dashboard"
    />
  );
}
