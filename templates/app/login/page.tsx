import { code, imp } from "ts-poet";

const Suspense = imp("Suspense@react")
const LoginForm = imp("LoginForm@@/components/routes/login/login-form")

export const writeLoginPage = () => code`
export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <${Suspense} fallback={<div className="text-xs text-muted-foreground">Loading…</div>}>
        <${LoginForm} />
      </${Suspense}>
    </div>
  );
}
`;

export default writeLoginPage;
