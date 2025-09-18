import Link from "next/link";
import { HardDrive, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
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
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-destructive" aria-hidden="true" />
            404 — Page missing
          </span>
          <h1 className="text-4xl font-serif md:text-5xl">
            We couldn&apos;t find that page
          </h1>
          <p className="mx-auto max-w-xl text-base text-muted-foreground">
            The link you followed may have moved or no longer exists. Let&apos;s get
            you back to where you need to be.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/dashboard" className="inline-flex">
              <Button className="flex w-full items-center justify-center gap-2">
                Go to dashboard
              </Button>
            </Link>
            <Link href="/" className="inline-flex">
              <Button
                variant="outline"
                className="flex w-full items-center justify-center gap-2 bg-transparent"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to home
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
