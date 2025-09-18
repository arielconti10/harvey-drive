"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { HardDrive } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const loginSchema = z.object({
    email: z
      .string()
      .min(1, "Email is required")
      .email("Enter a valid email address"),
    password: z.string().min(1, "Password is required"),
  });

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleLogin = async (values: z.infer<typeof loginSchema>) => {
    const supabase = createClient();
    form.clearErrors("root");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
            `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
      form.reset();
      router.push("/dashboard");
    } catch (error: unknown) {
      form.setError("root", {
        type: "manual",
        message:
          error instanceof Error ? error.message : "An unexpected error occurred",
      });
    }
  };

  const inputStyles = "border-white/15 bg-black/30 text-white placeholder:text-white/50 focus-visible:ring-white focus-visible:ring-offset-0";

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
          <Link href="/" className="text-sm text-white/60 hover:text-white">
            Back to site
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-10 text-center">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">
              Sign in
            </p>
            <h1 className="font-serif text-4xl text-white">Welcome back</h1>
            <p className="text-sm text-white/60">
              Enter your credentials to open your HarveyDrive workspace.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-left text-white/80">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleLogin)} className="space-y-5" noValidate>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          autoComplete="email"
                          placeholder="you@example.com"
                          className={inputStyles}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          autoComplete="current-password"
                          className={inputStyles}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {form.formState.errors.root?.message ? (
                  <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                    {form.formState.errors.root.message}
                  </div>
                ) : null}
                <Button
                  type="submit"
                  className="w-full bg-white text-[#0f0e0d] hover:bg-white/90"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </Form>
            <div className="mt-6 text-center text-sm text-white/60">
              Don&apos;t have an account?{" "}
              <Link href="/auth/signup" className="font-medium text-white hover:opacity-90">
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
