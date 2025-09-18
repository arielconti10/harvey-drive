import { Mail, HardDrive } from "lucide-react";
import Link from "next/link";

export default function VerifyEmailPage() {
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
          <div className="space-y-4">
            <Mail className="mx-auto h-16 w-16 text-white/80" aria-hidden="true" />
            <h1 className="font-serif text-4xl text-white">Check your email</h1>
            <p className="text-sm text-white/60">
              We&apos;ve sent you a verification link. Open it to activate your account and begin using HarveyDrive.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
            <p>Didn&apos;t receive anything?</p>
            <p className="mt-2">Remember to check your spam folder or request a new link.</p>
          </div>
          <Link href="/auth/login" className="text-sm text-white hover:opacity-90">
            Back to sign in
          </Link>
        </div>
      </main>
    </div>
  );
}
