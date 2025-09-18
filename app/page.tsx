import { Button } from "@/components/ui/button";
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
    <div className="min-h-screen flex flex-col dark bg-background text-foreground">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <HardDrive className="h-8 w-8 text-foreground" />
            <span className="text-2xl font-serif text-foreground">
              HarveyDrive
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/auth/login">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/auth/signup">
              <Button>Get started</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto flex-1 px-4 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-serif text-foreground mb-6 text-balance">
            Your files,{" "}
            <span className="text-muted-foreground">everywhere</span>
          </h1>
          <p className="text-xl font-light text-muted-foreground mb-8 text-pretty">
            Store, sync, and share your files with HarveyDrive. Access your
            documents, photos, and videos from any device, anywhere in the
            world.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup">
              <Button size="lg" className="text-lg px-8 py-3">
                Start for free
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button
                variant="outline"
                size="lg"
                className="text-lg px-8 py-3 bg-transparent"
              >
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-20 border-t border-border">
        <div className="text-center text-muted-foreground">
          <p>&copy; 2024 HarveyDrive. Built with Next.js and Supabase.</p>
        </div>
      </footer>
    </div>
  );
}
