"use client";

import { useEffect } from "react";
import Link from "next/link";
import { HardDrive, RefreshCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-secondary/20 text-foreground">
      <header className="container mx-auto flex items-center justify-between px-6 py-8">
        <div className="flex items-center gap-3">
          <HardDrive className="h-8 w-8" />
          <span className="text-2xl font-serif">HarveyDrive</span>
        </div>
        <Link href="/">
          <Button variant="ghost" className="flex items-center gap-2">
            <Home className="h-4 w-4" aria-hidden="true" />
            Home
          </Button>
        </Link>
      </header>

      <main className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <div className="space-y-6">
          <span className="inline-flex items-center rounded-full border border-border px-3 py-1 text-sm font-medium text-muted-foreground">
            Something went wrong
          </span>
          <h1 className="text-4xl font-serif md:text-5xl">We hit an unexpected snag</h1>
          <p className="mx-auto max-w-xl text-base text-muted-foreground">
            Our team has been notified. You can try again or head back to your
            dashboard while we get things sorted out.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              className="flex w-full items-center justify-center gap-2"
              onClick={() => reset()}
            >
              <RefreshCcw className="h-4 w-4" aria-hidden="true" />
              Try again
            </Button>
            <Link href="/dashboard" className="inline-flex">
              <Button
                variant="outline"
                className="flex w-full items-center justify-center gap-2 bg-transparent"
              >
                Go to dashboard
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
