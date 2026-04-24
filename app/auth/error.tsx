"use client";

import { useEffect } from "react";
import { ErrorPage } from "@/components/ui/error-page";

export default function AuthError({
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
      title="Authentication error"
      message={error.message}
      showRetryButton
      onRetry={reset}
      showHomeButton
      homeHref="/auth/login"
      homeLabel="Go to login"
    />
  );
}
