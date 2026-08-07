"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { Shrimp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { acarajePath } from "@/lib/acaraje-routes";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/acaraje/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Login failed");
        return;
      }
      const next = searchParams.get("next");
      const dest =
        next && next.startsWith(acarajePath("/")) && !next.startsWith("//")
          ? next
          : acarajePath("/dashboard");
      router.replace(dest);
      router.refresh();
    } catch {
      setError("Network error — try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm space-y-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex items-center justify-center w-12 h-12 rounded-md bg-primary border border-primary-foreground glow-primary-foreground-sm">
          <Shrimp className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Acaraje</h1>
          <p className="mt-1 text-xs font-mono text-muted-foreground/60 tracking-widest uppercase">
            Sign in to continue
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="username" className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Username
          </label>
          <Input
            id="username"
            name="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Password
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        {error && (
          <p className="text-sm text-red-400 border border-destructive/40 bg-destructive/10 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
