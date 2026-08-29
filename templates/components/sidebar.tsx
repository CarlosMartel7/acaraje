import { code, imp } from "ts-poet";

const Link = imp("Link=next/link")
const usePathname = imp("usePathname@next/navigation")
const useRouter = imp("useRouter@next/navigation")
const GitBranch = imp("GitBranch@lucide-react")
const LayoutDashboard = imp("LayoutDashboard@lucide-react")
const Table2 = imp("Table2@lucide-react")
const Layers = imp("Layers@lucide-react")
const ListTree = imp("ListTree@lucide-react")
const Sprout = imp("Sprout@lucide-react")
const PencilRuler = imp("PencilRuler@lucide-react")
const ChevronDown = imp("ChevronDown@lucide-react")
const Shrimp = imp("Shrimp@lucide-react")
const Cloud = imp("Cloud@lucide-react")
const FolderOpen = imp("FolderOpen@lucide-react")
const Upload = imp("Upload@lucide-react")
const LayoutGrid = imp("LayoutGrid@lucide-react")
const Plus = imp("Plus@lucide-react")
const LogOut = imp("LogOut@lucide-react")
const cn = imp("cn@@/lib/utils")
const acarajePath = imp("acarajePath@@/lib/acaraje-routes")
const Button = imp("Button@@/components/ui/button")
const Input = imp("Input@@/components/ui/input")
const useState = imp("useState@react")
const useSchemas = imp("useSchemas@@/query/hooks/use-schemas")
const useBoardsPages = imp("useBoardsPages@@/query/hooks/use-boards")
const useCreateBoardsPage = imp("useCreateBoardsPage@@/query/hooks/use-boards")

export const writeSidebarComponent = () => code`
interface SidebarProps {
  username?: string;
}

const topNavItems = [
  { href: ${acarajePath}("/dashboard"), label: "Overview", icon: ${LayoutDashboard}, description: "Schema summary" },
  { href: ${acarajePath}("/schemas"), label: "Models", icon: ${Table2}, description: "All Prisma models" },
  { href: ${acarajePath}("/relations"), label: "Relations", icon: ${GitBranch}, description: "Model relationships" },
];

const dataNavItems = [{ href: ${acarajePath}("/seeder"), label: "Seeder", icon: ${Sprout}, description: "Generate fake data" }];

const driveSubItems = [
  { href: ${acarajePath}("/drive"), label: "Upload", icon: ${Upload} },
  { href: ${acarajePath}("/drive/view"), label: "View", icon: ${FolderOpen} },
];

export function Sidebar({ username }: SidebarProps) {
  const pathname = ${usePathname}();
  const router = ${useRouter}();
  const [crudOpen, setCrudOpen] = ${useState}(false);
  const [driveOpen, setDriveOpen] = ${useState}(false);
  const [boardsOpen, setBoardsOpen] = ${useState}(false);
  const [addingPage, setAddingPage] = ${useState}(false);
  const [newPageName, setNewPageName] = ${useState}("");

  const { data: schemaData } = ${useSchemas}();
  const models = schemaData?.models?.map((m) => m.name) ?? [];
  const provider = schemaData?.datasource?.provider ?? "postgresql";

  const { data: pagesData } = ${useBoardsPages}();
  const pages = (pagesData?.pages ?? []).slice().sort((a, b) => a.order - b.order);

  const createPage = ${useCreateBoardsPage}();

  const submitNewPage = async () => {
    const name = newPageName.trim();
    if (!name) return;
    const page = await createPage.mutateAsync(name);
    setNewPageName("");
    setAddingPage(false);
    if (page?.slug) router.push(${acarajePath}(\`/boards/\${page.slug}\`));
  };

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col min-h-0 border-r border-border/60 bg-transparent">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary border border-primary-foreground glow-primary-foreground-sm">
            <${Shrimp} className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <div className="text-base font-semibold tracking-tight text-foreground">Acaraje</div>
            <div className="text-[10px] font-mono text-muted-foreground/60 tracking-widest uppercase">schema explorer</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-scroll flex-1 min-h-0 px-3 py-5 space-y-0.5 overflow-y-auto overflow-x-hidden">
        <p className="px-3 mb-3 text-[10px] font-mono tracking-[0.12em] uppercase text-muted-foreground/40">Explore</p>

        {topNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <${Link}
              key={item.href}
              href={item.href}
              className={${cn}(
                "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-all duration-150",
                isActive
                  ? "bg-primary border border-primary-foreground/25 text-primary-foreground "
                  : "text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent",
              )}
            >
              <item.icon
                className={${cn}(
                  "w-4 h-4 flex-shrink-0",
                  isActive ? "text-primary-foreground" : "text-muted-foreground/60 group-hover:text-muted-foreground",
                )}
              />
              <span className="flex-1 font-medium">{item.label}</span>
              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground opacity-80" />}
            </${Link}>
          );
        })}

        {/* Data section: Seeder, Drive, CRUD */}
        <div className="pt-4">
          <p className="px-3 mb-2 text-[10px] font-mono tracking-[0.12em] uppercase text-muted-foreground/40">Data</p>
          {/* CRUD accordion */}
          <div className="flex items-center gap-1 mt-0.5">
            <${Link}
              href={${acarajePath}("/crud")}
              className={${cn}(
                "flex-1 flex items-center gap-3 rounded-md px-3 py-2.5 h-auto font-medium text-sm",
                pathname.startsWith(${acarajePath}("/crud"))
                  ? "bg-primary border border-primary-foreground/25 text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent",
              )}
            >
              <${PencilRuler} className="w-4 h-4 flex-shrink-0 text-muted-foreground/60" />
              <span className="flex-1 text-left">CRUD</span>
            </${Link}>
            <${Button}
              variant="ghost"
              size="icon-sm"
              className="flex-shrink-0 text-muted-foreground/60 hover:text-foreground"
              onClick={() => setCrudOpen((v) => !v)}
              aria-label="Toggle CRUD submenu"
            >
              <${ChevronDown} className={${cn}("w-3.5 h-3.5 transition-transform duration-200", crudOpen && "rotate-180")} />
            </${Button}>
          </div>

          {crudOpen && (
            <div className="mt-1 ml-4 pl-3 border-l border-border/50 space-y-0.5">
              {models.map((model) => {
                const href = ${acarajePath}(\`/crud/\${model}\`);
                const isActive = pathname.startsWith(href);
                return (
                  <${Link}
                    key={model}
                    href={href}
                    className={${cn}(
                      "flex items-center gap-2 rounded px-2.5 py-1.5 text-xs font-mono transition-all",
                      isActive ? "text-primary-foreground bg-primary" : "text-muted-foreground/70 hover:text-foreground hover:bg-accent",
                    )}
                  >
                    <span className={${cn}("w-1 h-1 rounded-full flex-shrink-0", isActive ? "bg-primary-foreground" : "bg-border")} />
                    {model}
                  </${Link}>
                );
              })}
            </div>
          )}


          {dataNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <${Link}
                key={item.href}
                href={item.href}
                className={${cn}(
                  "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-all duration-150",
                  isActive
                    ? "bg-primary border border-primary-foreground/25 text-primary-foreground "
                    : "text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent",
                )}
              >
                <item.icon
                  className={${cn}(
                    "w-4 h-4 flex-shrink-0",
                    isActive ? "text-primary-foreground" : "text-muted-foreground/60 group-hover:text-muted-foreground",
                  )}
                />
                <span className="flex-1 font-medium">{item.label}</span>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground opacity-80" />}
              </${Link}>
            );
          })}

          {/* Drive accordion */}
          <div className="flex items-center gap-1 mt-0.5">
            <${Link}
              href={${acarajePath}("/drive")}
              className={${cn}(
                "flex-1 flex items-center gap-3 rounded-md px-3 py-2.5 h-auto font-medium text-sm",
                pathname.startsWith(${acarajePath}("/drive"))
                  ? "bg-primary border border-primary-foreground/25 text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent",
              )}
            >
              <${Cloud} className="w-4 h-4 flex-shrink-0 text-muted-foreground/60" />
              <span className="flex-1 text-left">Drive</span>
            </${Link}>
            <${Button}
              variant="ghost"
              size="icon-sm"
              className="flex-shrink-0 text-muted-foreground/60 hover:text-foreground"
              onClick={() => setDriveOpen((v) => !v)}
              aria-label="Toggle Drive submenu"
            >
              <${ChevronDown} className={${cn}("w-3.5 h-3.5 transition-transform duration-200", driveOpen && "rotate-180")} />
            </${Button}>
          </div>

          {driveOpen && (
            <div className="mt-1 ml-4 pl-3 border-l border-border/50 space-y-0.5">
              {driveSubItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <${Link}
                    key={item.href}
                    href={item.href}
                    className={${cn}(
                      "flex items-center gap-2 rounded px-2.5 py-1.5 text-xs transition-all",
                      isActive
                        ? "text-primary-foreground bg-primary font-medium"
                        : "text-muted-foreground/70 hover:text-foreground hover:bg-accent",
                    )}
                  >
                    <item.icon className="w-3 h-3 flex-shrink-0" />
                    {item.label}
                  </${Link}>
                );
              })}
            </div>
          )}

        </div>

        {/* Boards accordion */}
        <div className="pt-4">
          <p className="px-3 mb-2 text-[10px] font-mono tracking-[0.12em] uppercase text-muted-foreground/40">Analytics</p>
          <div className="flex items-center gap-1">
            <${Button}
              variant="ghost"
              onClick={() => setBoardsOpen((v) => !v)}
              className={${cn}(
                "flex-1 justify-start gap-3 rounded-md px-3 py-2.5 h-auto font-medium",
                pathname.startsWith(${acarajePath}("/boards"))
                  ? "bg-primary border border-primary-foreground/25 text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent",
              )}
            >
              <${LayoutGrid} className="w-4 h-4 flex-shrink-0 text-muted-foreground/60" />
              <span className="flex-1 text-left">Boards</span>
              <${ChevronDown}
                className={${cn}("w-3.5 h-3.5 text-muted-foreground/40 transition-transform duration-200", boardsOpen && "rotate-180")}
              />
            </${Button}>
            <${Button}
              variant="ghost"
              size="icon-sm"
              className="flex-shrink-0 text-muted-foreground/60 hover:text-foreground"
              onClick={() => {
                setBoardsOpen(true);
                setAddingPage((v) => !v);
              }}
              aria-label="New board page"
            >
              <${Plus} className="w-3.5 h-3.5" />
            </${Button}>
          </div>

          {boardsOpen && (
            <div className="mt-1 ml-4 pl-3 border-l border-border/50 space-y-0.5">
              {pages.map((page) => {
                const href = ${acarajePath}(\`/boards/\${page.slug}\`);
                const isActive = pathname === href;
                return (
                  <${Link}
                    key={page.id}
                    href={href}
                    className={${cn}(
                      "flex items-center gap-2 rounded px-2.5 py-1.5 text-xs transition-all",
                      isActive ? "text-primary-foreground bg-primary font-medium" : "text-muted-foreground/70 hover:text-foreground hover:bg-accent",
                    )}
                  >
                    <span className={${cn}("w-1 h-1 rounded-full flex-shrink-0", isActive ? "bg-primary-foreground" : "bg-border")} />
                    {page.name}
                  </${Link}>
                );
              })}

              {addingPage ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitNewPage();
                  }}
                  className="flex items-center gap-1 px-1 pt-1"
                >
                  <${Input}
                    autoFocus
                    value={newPageName}
                    onChange={(e) => setNewPageName(e.target.value)}
                    onBlur={() => !newPageName.trim() && setAddingPage(false)}
                    placeholder="Page name..."
                    className="h-7 text-xs"
                  />
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingPage(true)}
                  className="flex items-center gap-2 rounded px-2.5 py-1.5 text-xs text-muted-foreground/50 hover:text-foreground hover:bg-accent transition-all w-full"
                >
                  <${Plus} className="w-3 h-3 flex-shrink-0" />
                  New page
                </button>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-border/60 space-y-3">
        {username && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground truncate" title={username}>
              {username}
            </span>
            <${Button}
              type="button"
              variant="ghost"
              size="icon-sm"
              className="flex-shrink-0 text-muted-foreground hover:text-foreground"
              title="Sign out"
              onClick={async () => {
                await fetch("/api/acaraje/auth/logout", { method: "POST" });
                router.replace("/login");
                router.refresh();
              }}
            >
              <${LogOut} className="w-3.5 h-3.5" />
            </${Button}>
          </div>
        )}
        <div className="text-[10px] font-mono text-muted-foreground/35 space-y-1">
          <div className="flex items-center gap-2">
            <${Layers} className="w-3 h-3" />
            <span>prisma/schema.prisma</span>
          </div>
          <div className="flex items-center gap-2">
            <${ListTree} className="w-3 h-3" />
            <span>{provider} · dev</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
`.toString({ prefix: '"use client";' });

export default writeSidebarComponent;
