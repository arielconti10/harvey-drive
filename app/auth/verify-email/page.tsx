import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Mail, HardDrive } from "lucide-react";
import Link from "next/link";

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen dark bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <HardDrive className="h-12 w-12 text-foreground" />
          </div>
          <h1 className="text-3xl font-serif text-foreground">HarveyDrive</h1>
        </div>

        <Card className="shadow-xl bg-card text-card-foreground">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Mail className="h-16 w-16 text-foreground" />
            </div>
            <CardTitle className="text-2xl">Check your email</CardTitle>
            <CardDescription>
              We&apos;ve sent you a verification link to complete your
              registration
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-6">
              Click the link in your email to verify your account and start
              using HarveyDrive.
            </p>
            <Link
              href="/auth/login"
              className="text-primary-foreground hover:opacity-90 font-medium text-sm"
            >
              Back to sign in
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
