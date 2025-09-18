import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { HardDrive, AlertCircle } from "lucide-react";

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen dark bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <HardDrive className="h-12 w-12 text-foreground" />
          </div>
          <h1 className="text-3xl font-serif text-foreground">HarveyDrive</h1>
          <p className="text-muted-foreground">Your files, everywhere</p>
        </div>

        <Card className="shadow-xl bg-card text-card-foreground">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
            </div>
            <CardTitle className="text-2xl text-center">
              Authentication Error
            </CardTitle>
            <CardDescription className="text-center">
              There was an issue with the authentication process. Please try
              signing in again.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full">
              <Link href="/auth/login">Try Again</Link>
            </Button>
            <Button asChild variant="outline" className="w-full bg-transparent">
              <Link href="/">Go Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
