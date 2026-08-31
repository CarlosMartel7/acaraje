import { code, imp } from "ts-poet";

const HardDrive = imp("HardDrive@lucide-react")
const Card = imp("Card@@/components/ui/card")
const CardContent = imp("CardContent@@/components/ui/card")
const CardDescription = imp("CardDescription@@/components/ui/card")
const CardHeader = imp("CardHeader@@/components/ui/card")
const CardTitle = imp("CardTitle@@/components/ui/card")

export const writeSelectDriveComponent = () => code`
/** \`Drive.DriveType\` only ever has the one storage backend actually generated for this project
 *  (see \`generate-storage.ts\`) — there's nothing to switch between, so this surfaces which backend
 *  is active rather than pretending to be a picker. */
const DRIVE_LABELS: Record<Drive.DriveType, string> = {
  minio: "MinIO",
};

interface SelectDriveProps {
  value: Drive.DriveType;
  onChange: (value: Drive.DriveType) => void;
}

export function SelectDrive({ value }: SelectDriveProps) {
  return (
    <${Card}>
      <${CardHeader}>
        <${CardTitle} className="text-base flex items-center gap-2">
          <${HardDrive} className="w-4 h-4" />
          Storage Backend
        </${CardTitle}>
        <${CardDescription}>Files are uploaded to the storage backend configured for this project</${CardDescription}>
      </${CardHeader}>
      <${CardContent}>
        <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-secondary/20 px-4 py-3">
          <${HardDrive} className="w-5 h-5 text-primary-foreground/80 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-primary-foreground">{DRIVE_LABELS[value]}</p>
            <p className="text-xs text-muted-foreground">Active storage driver</p>
          </div>
        </div>
      </${CardContent}>
    </${Card}>
  );
}
`.toString({ prefix: '"use client";' });

export default writeSelectDriveComponent;
