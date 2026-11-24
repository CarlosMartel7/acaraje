import { code, imp } from "ts-poet";

const Link = imp("Link=next/link")
const Tag = imp("Tag@lucide-react")
const cn = imp("cn@@/lib/utils")
const getFieldTypeColor = imp("getFieldTypeColor@@/lib/utils")
const acarajePath = imp("acarajePath@@/lib/acaraje-routes")
const Button = imp("Button@@/components/ui/button")
const Card = imp("Card@@/components/ui/card")
const Table = imp("Table@@/components/ui/table")
const TableBody = imp("TableBody@@/components/ui/table")
const TableCell = imp("TableCell@@/components/ui/table")
const TableHead = imp("TableHead@@/components/ui/table")
const TableHeader = imp("TableHeader@@/components/ui/table")
const TableRow = imp("TableRow@@/components/ui/table")

export const writeSchemaModelViewer = () => code`
/** Attributes already rendered from the parsed flags (isId / isUnique / hasDefault / isRelation). */
const FLAG_ATTRIBUTES = /^(@id|@unique|@default|@relation|PRIMARY KEY|UNIQUE|FOREIGN KEY)\\b/;

function AttrTag({ children, tone = "primary", title }: { children: React.ReactNode; tone?: "primary" | "info" | "muted"; title?: string }) {
  return (
    <span
      title={title}
      className={${cn}(
        "inline-block rounded-md px-2 py-[3px] font-mono text-[10px]",
        tone === "primary" && "bg-primary/15 text-primary",
        tone === "info" && "bg-info/15 text-info",
        tone === "muted" && "bg-secondary text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

function FieldAttributes({ field }: { field: Schema.Field }) {
  const relationAttr = field.attributes.find((a) => a.startsWith("@relation"));
  const extra = field.attributes.filter((a) => !FLAG_ATTRIBUTES.test(a));

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {field.isId && <AttrTag>@id</AttrTag>}
      {field.isUnique && <AttrTag>@unique</AttrTag>}
      {field.hasDefault && <AttrTag>@default({field.defaultValue})</AttrTag>}
      {extra.map((a) => (
        <AttrTag key={a}>{a}</AttrTag>
      ))}
      {field.isRelation && (
        <AttrTag tone="info" title={relationAttr}>
          relation
        </AttrTag>
      )}
      {field.relationFields && field.relationFields.length > 0 && (
        <span className="font-mono text-[10px] text-muted-foreground">via {field.relationFields.join(", ")}</span>
      )}
    </div>
  );
}

export function SchemaModelViewer({
  model,
  recordCount,
  modelsCount,
  enumNames,
}: {
  model: Schema.Model | null;
  recordCount: number | undefined;
  modelsCount: number;
  enumNames: Set<string>;
}) {
  if (!model) {
    return (
      <${Card} className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <span className="mb-3.5 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
          <${Tag} className="h-5 w-5" />
        </span>
        <p className="text-sm font-semibold">Select a model to inspect its fields</p>
        <p className="mt-1 text-xs text-muted-foreground">{modelsCount} models available</p>
      </${Card}>
    );
  }

  const relationCount = model.fields.filter((f) => f.isRelation).length;
  const summary = [
    \`\${model.fields.length} fields\`,
    \`\${relationCount} relations\`,
    recordCount !== undefined ? \`\${recordCount.toLocaleString()} records\` : null,
    model.indexes.length > 0 ? \`\${model.indexes.length} indexes\` : null,
  ].filter(Boolean);

  return (
    <div className="space-y-4">
      <${Card} className="p-[18px]">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <h2 className="truncate text-base font-bold">{model.name}</h2>
            {model.mapName && <AttrTag tone="muted">{\`@@map("\${model.mapName}")\`}</AttrTag>}
          </div>
          <${Button} asChild>
            <${Link} href={${acarajePath}(\`/crud/\${model.name}\`)}>View records</${Link}>
          </${Button}>
        </div>
        <p className="mb-4 text-[11px] text-muted-foreground">{summary.join(" · ")}</p>

        <${Table}>
          <${TableHeader}>
            <${TableRow}>
              <${TableHead}>Field</${TableHead}>
              <${TableHead}>Type</${TableHead}>
              <${TableHead}>Attributes</${TableHead}>
            </${TableRow}>
          </${TableHeader}>
          <${TableBody}>
            {model.fields.map((field) => (
              <${TableRow} key={field.name}>
                <${TableCell} className="font-medium">{field.name}</${TableCell}>
                <${TableCell} className={${cn}("font-mono", ${getFieldTypeColor}(field.type, enumNames))}>
                  {field.type}
                  {field.isList && "[]"}
                  {!field.isRequired && "?"}
                </${TableCell}>
                <${TableCell} className="whitespace-normal">
                  <FieldAttributes field={field} />
                </${TableCell}>
              </${TableRow}>
            ))}
          </${TableBody}>
        </${Table}>
      </${Card}>

      {model.indexes.length > 0 && (
        <${Card} className="p-[18px]">
          <h3 className="mb-3 text-sm font-semibold">Indexes &amp; constraints</h3>
          <ul className="divide-y divide-border">
            {model.indexes.map((idx, i) => (
              <li key={i} className="py-2.5 font-mono text-xs text-muted-foreground">
                {idx}
              </li>
            ))}
          </ul>
        </${Card}>
      )}
    </div>
  );
}
`.toString({ prefix: '"use client";' });

export default writeSchemaModelViewer;
