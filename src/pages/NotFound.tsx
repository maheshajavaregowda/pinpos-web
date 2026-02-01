import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
      <p className="mt-2 text-xl">Page not found</p>
      <Button asChild className="mt-6">
        <a href="/dashboard">Go to Dashboard</a>
      </Button>
    </div>
  );
}
