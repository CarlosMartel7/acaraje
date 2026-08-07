import { Sidebar } from "@/components/sidebar";
import { getSession } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar username={session?.username} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
