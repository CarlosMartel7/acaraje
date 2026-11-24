import { code, imp } from "ts-poet";

const Link = imp("Link=next/link")
const usePathname = imp("usePathname@next/navigation")
const useState = imp("useState@react")
const LayoutDashboard = imp("LayoutDashboard@lucide-react")
const Table2 = imp("Table2@lucide-react")
const GitBranch = imp("GitBranch@lucide-react")
const Wrench = imp("Wrench@lucide-react")
const Sprout = imp("Sprout@lucide-react")
const Cloud = imp("Cloud@lucide-react")
const Upload = imp("Upload@lucide-react")
const FolderOpen = imp("FolderOpen@lucide-react")
const ChevronDown = imp("ChevronDown@lucide-react")
const Shrimp = imp("Shrimp@lucide-react")
const LucideIcon = imp("t:LucideIcon@lucide-react")
const cn = imp("cn@@/lib/utils")
const acarajePath = imp("acarajePath@@/lib/acaraje-routes")
const useSchemas = imp("useSchemas@@/query/hooks/use-schemas")
const useRelations = imp("useRelations@@/query/hooks/use-relations")
const useStats = imp("useStats@@/query/hooks/use-stats")

export const writeSidebarComponent = () => code`
const navItemClassName = (isActive: boolean) =>
  ${cn}(
    "group flex h-[38px] items-center gap-3 rounded-lg px-3 text-[13px] transition-colors",
    isActive ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
  );

function isWithin(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function CountBadge({ count }: { count: number | undefined }) {
  if (count === undefined) return null;
  return (
    <span className="ml-auto flex h-5 min-w-6 items-center justify-center rounded-full bg-primary/20 px-[7px] text-[10px] font-semibold text-primary">
      {count}
    </span>
  );
}

function NavLink({ href, label, icon: Icon, count, pathname }: { href: string; label: string; icon: ${LucideIcon}; count?: number; pathname: string }) {
  const isActive = isWithin(pathname, href);
  return (
    <${Link} href={href} className={navItemClassName(isActive)} aria-current={isActive ? "page" : undefined}>
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      <CountBadge count={count} />
    </${Link}>
  );
}

/** A top-level nav item whose children (CRUD models, Drive pages) expand underneath it. */
function NavGroup({
  href,
  label,
  icon: Icon,
  pathname,
  children,
}: {
  href: string;
  label: string;
  icon: ${LucideIcon};
  pathname: string;
  children: React.ReactNode;
}) {
  const isActive = isWithin(pathname, href);
  const [open, setOpen] = ${useState}(isActive);
  return (
    <div>
      <div className={${cn}(navItemClassName(isActive), "pr-1")}>
        <${Link} href={href} className="flex h-full flex-1 items-center gap-3" aria-current={pathname === href ? "page" : undefined}>
          <Icon className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1 truncate">{label}</span>
        </${Link}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={\`\${open ? "Collapse" : "Expand"} \${label}\`}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <${ChevronDown} className={${cn}("h-3.5 w-3.5 transition-transform duration-200", open && "rotate-180")} />
        </button>
      </div>
      {open && <div className="my-1 ml-[22px] space-y-0.5 border-l border-sidebar-border pl-3">{children}</div>}
    </div>
  );
}

function SubLink({ href, label, icon: Icon, isActive }: { href: string; label: string; icon?: ${LucideIcon}; isActive: boolean }) {
  return (
    <${Link}
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={${cn}(
        "flex h-8 items-center gap-2 rounded-md px-2.5 text-xs transition-colors",
        isActive ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
      )}
    >
      {Icon ? (
        <Icon className="h-3.5 w-3.5 flex-shrink-0" />
      ) : (
        <span className={${cn}("h-1.5 w-1.5 flex-shrink-0 rounded-full", isActive ? "bg-primary" : "bg-muted-foreground/40")} />
      )}
      <span className="truncate">{label}</span>
    </${Link}>
  );
}

function ConnectionCard({ provider }: { provider: string }) {
  const { isSuccess, isError } = ${useStats}();
  const status = isSuccess
    ? { label: "Database connected", dot: "bg-success" }
    : isError
      ? { label: "Database unreachable", dot: "bg-destructive" }
      : { label: "Connecting…", dot: "bg-muted-foreground animate-pulse" };

  return (
    <div className="mt-auto rounded-xl border border-border bg-card p-3.5 text-xs">
      <div className="flex items-center gap-2 font-semibold">
        <span className={${cn}("h-2 w-2 flex-shrink-0 rounded-full", status.dot)} />
        {status.label}
      </div>
      <p className="mt-1 font-mono text-[11px] leading-relaxed text-muted-foreground">
        {provider} · dev
        <br />
        prisma/schema.prisma
      </p>
    </div>
  );
}

export function Sidebar() {
  const pathname = ${usePathname}();
  const { data: schemaData } = ${useSchemas}();
  const { data: relationsData } = ${useRelations}();

  const models = schemaData?.models?.map((m) => m.name) ?? [];
  const provider = schemaData?.datasource?.provider ?? "postgresql";
  const driveHref = ${acarajePath}("/drive");
  const driveViewHref = ${acarajePath}("/drive/view");

  return (
    <aside className="flex min-h-0 w-64 flex-shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3.5 py-4 text-sidebar-foreground">
      <${Link} href={${acarajePath}("/dashboard")} className="mb-5 flex items-center gap-2.5 px-1 text-[17px] font-semibold">
        <span className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <${Shrimp} className="h-[17px] w-[17px]" />
        </span>
        Acaraje
      </${Link}>

      <nav className="sidebar-scroll -mx-1 flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-1 pb-4" aria-label="Main">
        <div className="space-y-0.5">
          <NavLink href={${acarajePath}("/dashboard")} label="Overview" icon={${LayoutDashboard}} pathname={pathname} />
          <NavLink href={${acarajePath}("/schemas")} label="Models" icon={${Table2}} count={schemaData?.models?.length} pathname={pathname} />
          <NavLink href={${acarajePath}("/relations")} label="Relations" icon={${GitBranch}} count={relationsData?.relations?.length} pathname={pathname} />
        </div>

        <p className="mx-3 mb-2 mt-[18px] text-[10px] font-semibold tracking-[0.14em] text-muted-foreground">DATA</p>
        <div className="space-y-0.5">
          <NavGroup href={${acarajePath}("/crud")} label="CRUD" icon={${Wrench}} pathname={pathname}>
            {models.map((model) => {
              const href = ${acarajePath}(\`/crud/\${model}\`);
              return <SubLink key={model} href={href} label={model} isActive={isWithin(pathname, href)} />;
            })}
          </NavGroup>
          <NavLink href={${acarajePath}("/seeder")} label="Seeder" icon={${Sprout}} pathname={pathname} />
          <NavGroup href={driveHref} label="Drive" icon={${Cloud}} pathname={pathname}>
            <SubLink href={driveHref} label="Upload" icon={${Upload}} isActive={pathname === driveHref} />
            <SubLink href={driveViewHref} label="View" icon={${FolderOpen}} isActive={isWithin(pathname, driveViewHref)} />
          </NavGroup>
        </div>
      </nav>

      <ConnectionCard provider={provider} />
    </aside>
  );
}
`.toString({ prefix: '"use client";' });

export default writeSidebarComponent;
