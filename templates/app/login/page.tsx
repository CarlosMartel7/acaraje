import { code, imp } from "ts-poet";

const Suspense = imp("Suspense@react")
const LoginForm = imp("LoginForm@@/components/routes/login/login-form")

export const writeLoginPage = () => code`
export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <${Suspense} fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
        <${LoginForm} />
      </${Suspense}>
    </div>
  );
}
`;

export default writeLoginPage;
