import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight">
            Welcome to REXFORM IAM
          </h1>
          <p className="max-w-md text-lg leading-8 text-muted-foreground">
            A secure identity and access management application built with
            Next.js, Ory Kratos, and Ory Keto.
          </p>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Button asChild size="lg" className="w-full">
            <Link href="/auth/login">Sign In</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/auth/registration">Sign Up</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
