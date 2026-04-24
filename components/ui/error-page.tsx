"use client";

import Link from "next/link";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorPageProps {
  title?: string;
  message?: string;
  showRetryButton?: boolean;
  showHomeButton?: boolean;
  homeHref?: string;
  homeLabel?: string;
  onRetry?: () => void;
}

export function ErrorPage({
  title = "Something went wrong",
  message,
  showRetryButton = false,
  showHomeButton = false,
  homeHref = "/",
  homeLabel = "Go home",
  onRetry,
}: ErrorPageProps) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-8 w-8 text-destructive" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">{title}</h2>
        {message && (
          <p className="max-w-md text-muted-foreground">{message}</p>
        )}
      </div>
      {(showRetryButton || showHomeButton) && (
        <div className="flex gap-3">
          {showRetryButton && (
            <Button variant="outline" onClick={onRetry} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
          )}
          {showHomeButton && (
            <Button asChild>
              <Link href={homeHref}>{homeLabel}</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
