import { Button } from "@/components/ui/button";
import Link from "next/link";
import { HardDrive, AlertCircle } from "lucide-react";

export default function AuthCodeErrorPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0f0e0d] text-white">
      <header className="px-6 py-6">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
          <Link href="/" className="flex items-center gap-3 text-sm text-white/70">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
              <HardDrive className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="font-serif text-lg text-white">HarveyDrive</span>
          </Link>
          <Link href="/auth/login" className="text-sm text-white/60 hover:text-white">
            Sign in
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8 text-center">
          <AlertCircle className="mx-auto h-14 w-14 text-red-400" aria-hidden="true" />
          <div className="space-y-3">
            <h1 className="font-serif text-4xl text-white">Authentication error</h1>
            <p className="text-sm text-white/60">
              We couldn&apos;t complete the sign-in process. Try again or head back to the homepage.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/80">
            <p className="text-sm">
              If the issue persists, request a new login link or contact your workspace admin.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button asChild className="w-full bg-white text-[#0f0e0d] hover:bg-white/90">
              <Link href="/auth/login">Try again</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full border-white/20 bg-transparent text-white hover:bg-white/10"
            >
              <Link href="/">Go home</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
