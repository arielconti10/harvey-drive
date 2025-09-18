import { Button } from "@/components/ui/button";
import Image from "next/image";
import { HardDrive } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

type SearchParams = Record<string, string | string[] | undefined>;

export default function HomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const code = searchParams.code;

  if (code) {
    const params = new URLSearchParams();

    Object.entries(searchParams).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((entry) => params.append(key, entry));
      } else if (value !== undefined) {
        params.set(key, value);
      }
    });

    const next = params.get("next") ?? "/dashboard";
    params.set("next", next);

    redirect(`/auth/callback?${params.toString()}`);
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0f0e0d] text-white">
      <header className="px-6 py-6">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-3 text-sm text-white/70"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
              <HardDrive className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="font-serif text-lg text-white">HarveyDrive</span>
          </Link>
          <Link
            href="/auth/login"
            className="text-sm text-white/60 hover:text-white"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-12 text-center sm:py-20">
        <div className="space-y-6">
          <p className="text-sm uppercase tracking-[0.28em] text-white/50">
            Professional Class Datarooms
          </p>
          <h1 className="text-balance font-serif text-5xl leading-tight sm:text-6xl">
            Secure intelligence for modern deal teams
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-white/70">
            Purpose-built automation that keeps every dataroom organised, every
            policy enforced, and every client response on-brand.
          </p>
          <div>
            <Link href="/auth/signup" className="inline-flex">
              <Button className="bg-white px-10 py-6 text-base font-medium text-[#0f0e0d] hover:bg-white/90">
                Sign up
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-16 w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-white/5">
          <Image
            src="/placeholder.jpg"
            alt="HarveyDrive app preview"
            width={1200}
            height={720}
            className="w-full object-cover"
            priority
          />
        </div>
      </main>

      <footer className="px-6 py-8 text-xs text-white/40">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-3 sm:flex-row">
          <p>
            &copy; {new Date().getFullYear()} HarveyDrive. Built for the
            Harvey.ai technical challenge.
          </p>
          <p>Security-first data rooms, built for modern deal teams.</p>
        </div>
      </footer>
    </div>
  );
}
