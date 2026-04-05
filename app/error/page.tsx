export const dynamic = "force-dynamic";

import { AlertCircle, Info } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default async function HydraErrorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const error =
    typeof params.error === "string" ? params.error : "";
  const desc =
    typeof params.error_description === "string"
      ? params.error_description
      : "";
  const hint =
    typeof params.error_hint === "string" ? params.error_hint : "";

  return (
    <main className="flex items-center justify-center p-6 py-16">
      <div className="w-full max-w-md space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Authentication Error</h1>
          <p className="text-sm text-muted-foreground mt-1">
            An error occurred during the OAuth2 flow
          </p>
        </div>

        {(error || desc) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            {error && <AlertTitle>{error}</AlertTitle>}
            {desc && <AlertDescription>{desc}</AlertDescription>}
          </Alert>
        )}

        {hint && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>{hint}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3 pt-2">
          <Button asChild>
            <Link href="/auth/login">Try Again</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/auth/login">Go to Login</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
