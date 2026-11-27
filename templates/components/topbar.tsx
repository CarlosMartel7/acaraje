import { code, imp } from "ts-poet";

const Fragment = imp("Fragment@react")
const Link = imp("Link=next/link")
const usePathname = imp("usePathname@next/navigation")
const useRouter = imp("useRouter@next/navigation")
const useQueryClient = imp("useQueryClient@@tanstack/react-query")
const ChevronLeft = imp("ChevronLeft@lucide-react")
const ChevronRight = imp("ChevronRight@lucide-react")
const RefreshCw = imp("RefreshCw@lucide-react")
const cn = imp("cn@@/lib/utils")
const ACARAJE_BASE = imp("ACARAJE_BASE@@/lib/acaraje-routes")
const acarajePath = imp("acarajePath@@/lib/acaraje-routes")

export const writeTopbarComponent = () => code`
/** Human labels for the first path segment under the panel's base path. */
const SECTION_LABELS: Record<string, string> = {
  dashboard: "Overview",
  schemas: "Models",
  relations: "Relations",
  crud: "CRUD",
  seeder: "Seeder",
  drive: "Drive",
};

const SUBPAGE_LABELS: Record<string, string> = {
  new: "New",
  view: "View",
};

type Crumb = { label: string; href: string };

function buildCrumbs(pathname: string): Crumb[] {
  const rest = pathname.startsWith(${ACARAJE_BASE}) ? pathname.slice(${ACARAJE_BASE}.length) : pathname;
  const segments = rest.split("/").filter(Boolean);
  const crumbs: Crumb[] = [];
  let href = "";
  for (const [i, segment] of segments.entries()) {
    href += \`/\${segment}\`;
    const decoded = decodeURIComponent(segment);
    const label = i === 0 ? (SECTION_LABELS[segment] ?? decoded) : (SUBPAGE_LABELS[segment] ?? decoded);
    crumbs.push({ label, href: ${acarajePath}(href) });
  }
  return crumbs;
}

const iconButtonClassName =
  "flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50";

export function Topbar({ username }: { username?: string }) {
  const pathname = ${usePathname}();
  const router = ${useRouter}();
  const queryClient = ${useQueryClient}();
  const crumbs = buildCrumbs(pathname);

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-[22px] py-3">
      <div className="flex min-w-0 items-center gap-3 text-xs text-muted-foreground">
        <div className="flex items-center">
          <button type="button" onClick={() => router.back()} aria-label="Go back" className={iconButtonClassName}>
            <${ChevronLeft} className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => router.forward()} aria-label="Go forward" className={iconButtonClassName}>
            <${ChevronRight} className="h-4 w-4" />
          </button>
        </div>
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2">
          <${Link} href={${acarajePath}("/dashboard")} className="transition-colors hover:text-foreground">
            Acaraje
          </${Link}>
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <${Fragment} key={crumb.href}>
                <span aria-hidden="true">›</span>
                {isLast ? (
                  <span className="truncate text-foreground" aria-current="page">
                    {crumb.label}
                  </span>
                ) : (
                  <${Link} href={crumb.href} className="truncate transition-colors hover:text-foreground">
                    {crumb.label}
                  </${Link}>
                )}
              </${Fragment}>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            queryClient.invalidateQueries();
            router.refresh();
          }}
          aria-label="Refresh data"
          title="Refresh data"
          className={iconButtonClassName}
        >
          <${RefreshCw} className="h-4 w-4" />
        </button>
        {username && (
          <button
            type="button"
            onClick={signOut}
            title={\`Signed in as \${username} — sign out\`}
            aria-label={\`Sign out \${username}\`}
            className={${cn}(
              "flex h-[30px] w-[30px] items-center justify-center rounded-full bg-primary text-[11px] font-bold uppercase text-primary-foreground",
              "transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            )}
          >
            {username.charAt(0)}
          </button>
        )}
      </div>
    </header>
  );
}
`.toString({ prefix: '"use client";' });

export default writeTopbarComponent;
