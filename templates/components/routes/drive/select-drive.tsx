import { code, imp } from "ts-poet";

const Database = imp("Database@lucide-react")
const cn = imp("cn@@/lib/utils")
const Card = imp("Card@@/components/ui/card")

export const writeSelectDriveComponent = () => code`
/** \`Drive.DriveType\` only ever has the one storage backend actually generated for this project
 *  (see \`generate-storage.ts\`) — there's nothing to switch between, so this surfaces which backend
 *  is active rather than pretending to be a picker. */
const DRIVE_LABELS: Record<Drive.DriveType, string> = {
  minio: "MinIO",
};

const STATUS = {
  connected: { label: "CONNECTED", className: "bg-success/15 text-success" },
  error: { label: "UNREACHABLE", className: "bg-destructive/15 text-red-400" },
} as const;

interface SelectDriveProps {
  value: Drive.DriveType;
  onChange: (value: Drive.DriveType) => void;
  /** Whether the storage backend answered the folder listing request. */
  status: keyof typeof STATUS;
}

export function SelectDrive({ value, status }: SelectDriveProps) {
  return (
    <${Card} className="p-[18px]">
      <div className="mb-3.5 flex items-center gap-3">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground/90">
          <${Database} className="h-4 w-4" />
        </span>
        <h2 className="text-sm font-semibold">Storage backend</h2>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-lg font-bold">{DRIVE_LABELS[value]}</span>
        <span className={${cn}("rounded-md px-2.5 py-1 text-[10px] font-semibold tracking-wide", STATUS[status].className)}>
          ● {STATUS[status].label}
        </span>
      </div>
      <p className="mt-2.5 text-xs text-muted-foreground">Files are uploaded to the storage backend configured for this project</p>
    </${Card}>
  );
}
`.toString({ prefix: '"use client";' });

export default writeSelectDriveComponent;
