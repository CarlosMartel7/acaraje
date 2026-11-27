import { code, imp } from "ts-poet";

const Skeleton = imp("Skeleton@@/components/ui/skeleton")
const Card = imp("Card@@/components/ui/card")
const cn = imp("cn@@/lib/utils")
const ConnectionBadge = imp("ConnectionBadge@@/components/connection-badge")

export const writeSkeletonsComponent = () => code`
function SkeletonTable({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <${Card} className="overflow-hidden">
      <div className="border-b border-border/50 px-4 py-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <${Skeleton} key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="px-4 py-3 flex gap-4 border-b border-border/30 last:border-0">
          {Array.from({ length: cols }).map((_, col) => (
            <${Skeleton} key={col} className="h-4 flex-1" style={{ maxWidth: col === 0 ? "8rem" : undefined }} />
          ))}
        </div>
      ))}
    </${Card}>
  );
}

/**
 * \`*Header\` components render the page's real title/description (static copy, no fetched
 * data) so they can be shown immediately by both \`loading.tsx\` and the page's own content
 * component — the header never has to wait on the client-side data fetch that follows.
 * \`*BodySkeleton\` components skeleton only the data-dependent parts below the header, for use
 * inside content components while their own fetch is in flight. \`*Skeleton\` = Header + BodySkeleton,
 * kept for \`loading.tsx\`, which only ever gets the full-page fallback.
 */

/** Shared page title block: 22px title, muted one-line description, optional actions on the right. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[22px] font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}

export function DashboardHeader() {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-success" />
        <${ConnectionBadge} />
      </div>
      <PageHeader
        title="Overview"
        description={
          <>
            Real-time introspection of your{" "}
            <code className="rounded-md bg-primary/15 px-1.5 py-0.5 font-mono text-[11px] text-primary">prisma/schema.prisma</code>
          </>
        }
      />
    </div>
  );
}

export function DashboardBodySkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <${Card} key={i} className="p-5 space-y-4">
            <${Skeleton} className="h-3 w-20" />
            <${Skeleton} className="h-9 w-16" />
            <${Skeleton} className="h-3 w-24" />
          </${Card}>
        ))}
      </div>
      <div className="space-y-3">
        <${Skeleton} className="h-5 w-32" />
        <SkeletonTable rows={5} cols={4} />
      </div>
    </>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="p-8 space-y-8">
      <DashboardHeader />
      <DashboardBodySkeleton />
    </div>
  );
}

export function SchemasHeader() {
  return <PageHeader title="Schema Explorer" description="Browse models, enums and their fields" />;
}

/** Skeleton for the tabs, filter and model list inside the left-hand card. */
export function SchemasSidebarBodySkeleton() {
  return (
    <div className="space-y-3.5">
      <div className="flex gap-2">
        <${Skeleton} className="h-8 w-24" />
        <${Skeleton} className="h-8 w-20" />
      </div>
      <${Skeleton} className="h-[38px] w-full" />
      <div className="space-y-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <${Skeleton} key={i} className="h-[42px] w-full" />
        ))}
      </div>
    </div>
  );
}

/** Skeleton for the right-hand model viewer card. */
export function SchemasViewerSkeleton() {
  return (
    <${Card} className="space-y-4 p-[18px]">
      <div className="flex items-center justify-between">
        <${Skeleton} className="h-5 w-32" />
        <${Skeleton} className="h-9 w-28" />
      </div>
      <${Skeleton} className="h-3 w-48" />
      <SkeletonTable rows={8} cols={3} />
    </${Card}>
  );
}

export function SchemasSkeleton() {
  return (
    <div className="space-y-5 p-6">
      <SchemasHeader />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(240px,300px)_1fr]">
        <${Card} className="p-4">
          <SchemasSidebarBodySkeleton />
        </${Card}>
        <SchemasViewerSkeleton />
      </div>
    </div>
  );
}

export function RelationsHeader({ summary }: { summary?: string }) {
  return <PageHeader title="Relations" description={summary ?? "Model relationships inferred from your Prisma schema"} />;
}

export function RelationsBodySkeleton() {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2.5">
        <${Skeleton} className="h-[38px] w-full sm:w-[280px]" />
        {Array.from({ length: 5 }).map((_, i) => (
          <${Skeleton} key={i} className="h-8 w-14" />
        ))}
      </div>
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr))]">
        {Array.from({ length: 4 }).map((_, i) => (
          <${Card} key={i} className="space-y-3 p-[18px]">
            <div className="flex items-center gap-2.5">
              <${Skeleton} className="h-9 w-9" />
              <${Skeleton} className="h-4 w-28" />
            </div>
            {Array.from({ length: 2 }).map((_, j) => (
              <${Skeleton} key={j} className="h-10 w-full" />
            ))}
          </${Card}>
        ))}
      </div>
    </>
  );
}

export function RelationsSkeleton() {
  return (
    <div className="space-y-5 p-6">
      <RelationsHeader />
      <RelationsBodySkeleton />
    </div>
  );
}

export function SeederHeader({ actions }: { actions?: React.ReactNode }) {
  return <PageHeader title="Seeder" description="Generate fake data for development" actions={actions} />;
}

export function SeederBodySkeleton() {
  return (
    <>
      <div className="flex flex-wrap gap-4">
        <${Skeleton} className="h-[60px] w-48 rounded-xl" />
        <${Skeleton} className="h-[60px] min-w-[280px] flex-1 rounded-xl" />
      </div>
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(340px,100%),1fr))]">
        {Array.from({ length: 6 }).map((_, i) => (
          <${Card} key={i} className="flex items-center gap-3.5 p-[18px]">
            <${Skeleton} className="h-9 w-9 flex-shrink-0" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <${Skeleton} className="h-3.5 w-24" />
              <${Skeleton} className="h-3 w-16" />
            </div>
            <${Skeleton} className="h-8 w-24" />
            <${Skeleton} className="h-8 w-8" />
            <${Skeleton} className="h-8 w-14" />
          </${Card}>
        ))}
      </div>
    </>
  );
}

export function SeederSkeleton() {
  return (
    <div className="space-y-5 p-6">
      <SeederHeader actions={<${Skeleton} className="h-10 w-40" />} />
      <SeederBodySkeleton />
    </div>
  );
}

export function DriveUploadHeader() {
  return (
    <PageHeader title="Drive" description="Upload and manage files in object storage" />
  );
}

export function DriveUploadBodySkeleton() {
  return (
    <>
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))]">
        <${Card} className="space-y-3.5 p-[18px]">
          <div className="flex items-center gap-3">
            <${Skeleton} className="h-9 w-9" />
            <${Skeleton} className="h-4 w-28" />
          </div>
          <${Skeleton} className="h-6 w-40" />
          <${Skeleton} className="h-3 w-56" />
        </${Card}>
        <${Card} className="space-y-3.5 p-[18px]">
          <div className="flex items-center gap-3">
            <${Skeleton} className="h-9 w-9" />
            <${Skeleton} className="h-4 w-28" />
          </div>
          <${Skeleton} className="h-32 w-full" />
        </${Card}>
      </div>
      <${Card} className="flex flex-col items-center gap-3 border-dashed px-6 py-[52px]">
        <${Skeleton} className="h-[54px] w-[54px] rounded-[14px]" />
        <${Skeleton} className="h-4 w-56" />
        <${Skeleton} className="h-3 w-40" />
        <${Skeleton} className="mt-2 h-10 w-36" />
      </${Card}>
    </>
  );
}

export function DriveUploadSkeleton() {
  return (
    <div className="space-y-5 p-6">
      <DriveUploadHeader />
      <DriveUploadBodySkeleton />
    </div>
  );
}

export function DriveViewHeader() {
  return (
    <PageHeader title="Drive View" description="Browse folders and files in storage" />
  );
}

export function DriveViewBodySkeleton() {
  return <SkeletonTable rows={8} cols={4} />;
}

export function DriveViewSkeleton() {
  return (
    <div className="p-8 space-y-6">
      <DriveViewHeader />
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <${Skeleton} key={i} className="h-6 w-20" />
        ))}
      </div>
      <DriveViewBodySkeleton />
    </div>
  );
}

export function CrudOverviewHeader({ actions }: { actions?: React.ReactNode }) {
  return <PageHeader title="CRUD" description="Create, read, update and delete records for any model" actions={actions} />;
}

export function CrudOverviewBodySkeleton() {
  return (
    <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(250px,100%),1fr))]">
      {Array.from({ length: 6 }).map((_, i) => (
        <${Card} key={i} className="space-y-[18px] p-[18px]">
          <div className="flex items-center gap-3">
            <${Skeleton} className="h-9 w-9" />
            <div className="space-y-1.5">
              <${Skeleton} className="h-3.5 w-24" />
              <${Skeleton} className="h-3 w-16" />
            </div>
          </div>
          <div className="flex gap-2">
            <${Skeleton} className="h-8 w-24" />
            <${Skeleton} className="h-8 w-28" />
          </div>
        </${Card}>
      ))}
    </div>
  );
}

export function CrudOverviewSkeleton() {
  return (
    <div className="space-y-5 p-6">
      <CrudOverviewHeader />
      <CrudOverviewBodySkeleton />
    </div>
  );
}

export function CrudListBodySkeleton() {
  return (
    <>
      <${Skeleton} className="h-9 w-full max-w-sm" />
      <SkeletonTable rows={10} cols={5} />
      <div className="flex justify-between items-center">
        <${Skeleton} className="h-4 w-32" />
        <div className="flex gap-2">
          <${Skeleton} className="h-9 w-9" />
          <${Skeleton} className="h-9 w-9" />
        </div>
      </div>
    </>
  );
}

export function CrudListSkeleton() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <${Skeleton} className="h-3 w-32" />
          <${Skeleton} className="h-8 w-40" />
          <${Skeleton} className="h-4 w-28" />
        </div>
        <div className="flex gap-2">
          <${Skeleton} className="h-9 w-9" />
          <${Skeleton} className="h-9 w-28" />
        </div>
      </div>
      <${Skeleton} className="h-9 w-full max-w-sm" />
      <SkeletonTable rows={10} cols={5} />
      <div className="flex justify-between items-center">
        <${Skeleton} className="h-4 w-32" />
        <div className="flex gap-2">
          <${Skeleton} className="h-9 w-9" />
          <${Skeleton} className="h-9 w-9" />
        </div>
      </div>
    </div>
  );
}

export function CrudFormBodySkeleton() {
  return (
    <${Card} className="p-6 space-y-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <${Skeleton} className="h-3 w-24" />
          <${Skeleton} className="h-9 w-full" />
        </div>
      ))}
      <div className="flex gap-2 pt-2">
        <${Skeleton} className="h-9 w-24" />
        <${Skeleton} className="h-9 w-20" />
      </div>
    </${Card}>
  );
}

export function WidgetBodySkeleton({ className }: { className?: string }) {
  return <${Skeleton} className={${cn}("h-40 w-full rounded-lg", className)} />;
}

export function CrudFormSkeleton() {
  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <${Skeleton} className="h-3 w-40" />
      <div className="space-y-2">
        <${Skeleton} className="h-8 w-56" />
        <${Skeleton} className="h-4 w-72 max-w-full" />
      </div>
      <CrudFormBodySkeleton />
    </div>
  );
}
`;

export default writeSkeletonsComponent;
