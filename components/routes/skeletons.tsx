import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

function SkeletonTable({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border/50 px-4 py-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="px-4 py-3 flex gap-4 border-b border-border/30 last:border-0">
          {Array.from({ length: cols }).map((_, col) => (
            <Skeleton key={col} className="h-4 flex-1" style={{ maxWidth: col === 0 ? "8rem" : undefined }} />
          ))}
        </div>
      ))}
    </Card>
  );
}

/**
 * `*Header` components render the page's real title/description (static copy, no fetched
 * data) so they can be shown immediately by both `loading.tsx` and the page's own content
 * component — the header never has to wait on the client-side data fetch that follows.
 * `*BodySkeleton` components skeleton only the data-dependent parts below the header, for use
 * inside content components while their own fetch is in flight. `*Skeleton` = Header + BodySkeleton,
 * kept for `loading.tsx`, which only ever gets the full-page fallback.
 */

export function DashboardHeader() {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mb-2">
        <span className="text-primary-foreground">●</span>
        <span>CONNECTED · postgresql</span>
      </div>
      <h1 className="text-2xl font-bold tracking-tight">Schema Overview</h1>
      <p className="text-muted-foreground text-sm mt-1">
        Real-time introspection of your{" "}
        <code className="font-mono text-primary-foreground text-xs bg-primary px-1.5 py-0.5 rounded">prisma/schema.prisma</code>
      </p>
    </div>
  );
}

export function DashboardBodySkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-5 space-y-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-3 w-24" />
          </Card>
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
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
  return <h1 className="text-sm font-bold mb-3">Schema Explorer</h1>;
}

/** Skeleton for the model/enum list below the (always-real) sidebar header + search box. */
export function SchemasSidebarBodySkeleton() {
  return (
    <>
      <div className="px-4 pt-3 pb-2 shrink-0">
        <div className="flex gap-2">
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-8 flex-1" />
        </div>
      </div>
      <div className="p-2 space-y-1 flex-1">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    </>
  );
}

/** Skeleton for the right-hand model viewer panel. */
export function SchemasViewerSkeleton() {
  return (
    <div className="flex-1 p-8 space-y-4">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-4 w-64" />
      <SkeletonTable rows={8} cols={5} />
    </div>
  );
}

export function SchemasSkeleton() {
  return (
    <div className="flex h-full min-h-[calc(100vh-4rem)]">
      <div className="w-72 flex-shrink-0 border-r border-border/50 flex flex-col">
        <div className="p-4 border-b border-border/50 space-y-3">
          <SchemasHeader />
          <Skeleton className="h-8 w-full" />
        </div>
        <SchemasSidebarBodySkeleton />
      </div>
      <SchemasViewerSkeleton />
    </div>
  );
}

export function RelationsHeader() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Relations</h1>
      <p className="text-muted-foreground text-sm mt-1">Model relationships inferred from your Prisma schema</p>
    </div>
  );
}

export function RelationsBodySkeleton() {
  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3">
        <Skeleton className="h-9 w-full sm:max-w-xs" />
        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-5 space-y-3">
            <Skeleton className="h-5 w-32" />
            {Array.from({ length: 3 }).map((_, j) => (
              <Skeleton key={j} className="h-10 w-full" />
            ))}
          </Card>
        ))}
      </div>
    </>
  );
}

export function RelationsSkeleton() {
  return (
    <div className="p-8 space-y-6">
      <RelationsHeader />
      <RelationsBodySkeleton />
    </div>
  );
}

export function SeederHeader() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Database Seeder</h1>
      <p className="text-muted-foreground text-sm mt-1">Generate realistic fake data for each model</p>
    </div>
  );
}

export function SeederBodySkeleton() {
  return (
    <>
      <div className="flex items-center gap-3">
        <div className="space-y-1 text-right hidden sm:block">
          <Skeleton className="h-8 w-16 ml-auto" />
          <Skeleton className="h-3 w-20 ml-auto" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      <Skeleton className="h-14 w-full rounded-lg" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="flex-shrink-0 w-6 h-6 rounded-full" />
              <div className="flex-1 min-w-0 space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="flex items-center gap-1">
                <Skeleton className="h-6 w-6" />
                <Skeleton className="h-8 w-12" />
                <Skeleton className="h-6 w-6" />
              </div>
              <Skeleton className="h-8 w-16" />
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

export function SeederSkeleton() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <SeederHeader />
        <div className="flex items-center gap-3">
          <div className="space-y-1 text-right hidden sm:block">
            <Skeleton className="h-8 w-16 ml-auto" />
            <Skeleton className="h-3 w-20 ml-auto" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
      </div>
      <Skeleton className="h-14 w-full rounded-lg" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="flex-shrink-0 w-6 h-6 rounded-full" />
              <div className="flex-1 min-w-0 space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="flex items-center gap-1">
                <Skeleton className="h-6 w-6" />
                <Skeleton className="h-8 w-12" />
                <Skeleton className="h-6 w-6" />
              </div>
              <Skeleton className="h-8 w-16" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function DriveUploadHeader() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Drive Upload</h1>
      <p className="text-muted-foreground text-sm mt-1">Select a folder and upload files to MinIO storage</p>
    </div>
  );
}

export function DriveUploadBodySkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 space-y-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </Card>
        <Card className="p-6 space-y-3">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </Card>
      </div>
      <Card className="p-6 space-y-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-24 w-full rounded-lg border border-dashed border-border/50 bg-transparent" />
      </Card>
    </>
  );
}

export function DriveUploadSkeleton() {
  return (
    <div className="p-8 space-y-6">
      <DriveUploadHeader />
      <DriveUploadBodySkeleton />
    </div>
  );
}

export function DriveViewHeader() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Drive View</h1>
      <p className="text-muted-foreground text-sm mt-1">Browse folders and files in storage</p>
    </div>
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
          <Skeleton key={i} className="h-6 w-20" />
        ))}
      </div>
      <DriveViewBodySkeleton />
    </div>
  );
}

export function CrudListBodySkeleton() {
  return (
    <>
      <Skeleton className="h-9 w-full max-w-sm" />
      <SkeletonTable rows={10} cols={5} />
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-9" />
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
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      <Skeleton className="h-9 w-full max-w-sm" />
      <SkeletonTable rows={10} cols={5} />
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-9" />
        </div>
      </div>
    </div>
  );
}

export function CrudFormBodySkeleton() {
  return (
    <Card className="p-6 space-y-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-20" />
      </div>
    </Card>
  );
}

export function BoardsPageBodySkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="p-5 space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </Card>
      ))}
    </div>
  );
}

export function BoardsPageSkeleton() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-28" />
      </div>
      <BoardsPageBodySkeleton />
    </div>
  );
}

export function WidgetBodySkeleton() {
  return <Skeleton className="h-40 w-full rounded-lg" />;
}

export function CrudFormSkeleton() {
  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <Skeleton className="h-3 w-40" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <CrudFormBodySkeleton />
    </div>
  );
}
