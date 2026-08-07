import { Suspense } from "react";
import { LoginForm } from "@/components/routes/login/login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
