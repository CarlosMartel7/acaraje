import { code, imp } from "ts-poet";

const Sidebar = imp("Sidebar@@/components/sidebar")
const getSession = imp("getSession@@/lib/auth")

export const writeAdminLayout = () => code`
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await ${getSession}();

  return (
    <div className="flex h-screen overflow-hidden">
      <${Sidebar} username={session?.username} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
`;

export default writeAdminLayout;
