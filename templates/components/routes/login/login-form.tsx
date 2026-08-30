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
    <div className="w-full max-w-sm space-y-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex items-center justify-center w-12 h-12 rounded-md bg-primary border border-primary-foreground glow-primary-foreground-sm">
          <${Shrimp} className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Acaraje</h1>
          <p className="mt-1 text-xs font-mono text-muted-foreground/60 tracking-widest uppercase">
            Sign in to continue
          </p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-4"
      >
        <form.Field name="username">
          {(field) => (
            <div className="space-y-2">
              <label htmlFor="username" className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Username
              </label>
              <${Input}
                id="username"
                name="username"
                autoComplete="username"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </div>
          )}
        </form.Field>

        <form.Field name="password">
          {(field) => (
            <div className="space-y-2">
              <label htmlFor="password" className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Password
              </label>
              <${Input}
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </div>
          )}
        </form.Field>

        {error && (
          <p className="text-sm text-red-400 border border-destructive/40 bg-destructive/10 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <${Button} type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in…" : "Sign in"}
            </${Button}>
          )}
        </form.Subscribe>
      </form>
    </div>
  );
}
`.toString({ prefix: '"use client";' });

export default writeLoginForm;
