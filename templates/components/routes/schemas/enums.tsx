import { code, imp } from "ts-poet";

const Layers = imp("Layers@lucide-react")

export const writeSchemaEnumsTab = () => code`
export function SchemaEnumsTab({ enums }: { enums: Schema.EnumType[] }) {
  if (enums.length === 0) {
    return <p className="px-3.5 py-6 text-center text-xs text-muted-foreground">No enums match your filter</p>;
  }

  return (
    <ul className="flex flex-col gap-1">
      {enums.map((enumType) => (
        <li key={enumType.name} className="rounded-lg px-3.5 py-[11px]">
          <div className="flex items-center gap-2.5 text-[13px] text-foreground">
            <${Layers} className="h-4 w-4 flex-shrink-0 text-warning" />
            <span className="truncate">{enumType.name}</span>
            <span className="ml-auto flex-shrink-0 text-[11px] text-muted-foreground">{enumType.values.length} values</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 pl-[26px]">
            {enumType.values.map((v) => (
              <span key={v} className="rounded-md bg-warning/15 px-2 py-[3px] font-mono text-[10px] text-warning">
                {v}
              </span>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}
`.toString({ prefix: '"use client";' });

export default writeSchemaEnumsTab;
