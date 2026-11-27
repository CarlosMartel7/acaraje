import { code, imp } from "ts-poet";

const Sidebar = imp("Sidebar@@/components/sidebar")
const Topbar = imp("Topbar@@/components/topbar")
const getSession = imp("getSession@@/lib/auth")

export const writeAdminLayout = () => code`
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await ${getSession}();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <${Sidebar} />
      <div className="flex min-w-0 flex-1 flex-col">
        <${Topbar} username={session?.username} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
`;

export default writeAdminLayout;
