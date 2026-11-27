import { code, imp } from "ts-poet";

const useRouter = imp("useRouter@next/navigation")
const useSearchParams = imp("useSearchParams@next/navigation")
const useState = imp("useState@react")
const useForm = imp("useForm@@tanstack/react-form")
const z = imp("z@zod")
const Shrimp = imp("Shrimp@lucide-react")
const Button = imp("Button@@/components/ui/button")
const Input = imp("Input@@/components/ui/input")
const acarajePath = imp("acarajePath@@/lib/acaraje-routes")

export const writeLoginForm = () => code`
const loginSchema = ${z}.object({
  username: ${z}.string().min(1, "Username is required"),
  password: ${z}.string().min(1, "Password is required"),
});

export function LoginForm() {
  const router = ${useRouter}();
  const searchParams = ${useSearchParams}();
  const [error, setError] = ${useState}<string | null>(null);

  const form = ${useForm}({
    defaultValues: { username: "", password: "" },
    validators: { onSubmit: loginSchema },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(value),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(typeof data.error === "string" ? data.error : "Login failed");
          return;
        }
        const next = searchParams.get("next");
        const dest = next && next.startsWith(${acarajePath}("/")) && !next.startsWith("//") ? next : ${acarajePath}("/dashboard");
        router.replace(dest);
        router.refresh();
      } catch {
        setError("Network error — try again");
      }
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="w-full max-w-[400px] rounded-xl border border-border bg-card px-[34px] py-9 shadow-2xl shadow-black/40"
    >
      <div className="mb-7 flex flex-col items-center gap-3 text-center">
        <span className="flex h-[52px] w-[52px] items-center justify-center rounded-[14px] bg-primary text-primary-foreground">
          <${Shrimp} className="h-7 w-7" />
        </span>
        <h1 className="text-2xl font-bold tracking-tight">Acaraje</h1>
        <p className="text-[10px] font-medium tracking-[0.14em] text-muted-foreground">SIGN IN TO CONTINUE</p>
      </div>

      <div className="space-y-[18px]">
        <form.Field name="username">
          {(field) => (
            <div>
              <label htmlFor="username" className="mb-2 block text-xs font-medium text-foreground/75">
                Username
              </label>
              <${Input}
                id="username"
                name="username"
                autoComplete="username"
                placeholder="admin"
                className="h-11"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </div>
          )}
        </form.Field>

        <form.Field name="password">
          {(field) => (
            <div>
              <label htmlFor="password" className="mb-2 block text-xs font-medium text-foreground/75">
                Password
              </label>
              <${Input}
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className="h-11"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </div>
          )}
        </form.Field>
      </div>

      {error && (
        <p role="alert" className="mt-[18px] rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-red-400">
          {error}
        </p>
      )}

      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <${Button} type="submit" size="lg" className="mt-[26px] w-full text-[13px]" disabled={isSubmitting}>
            {isSubmitting ? "Signing in…" : "Sign in"}
          </${Button}>
        )}
      </form.Subscribe>

      <p className="mt-[18px] text-center font-mono text-[11px] text-muted-foreground/80">prisma/schema.prisma</p>
    </form>
  );
}
`.toString({ prefix: '"use client";' });

export default writeLoginForm;
