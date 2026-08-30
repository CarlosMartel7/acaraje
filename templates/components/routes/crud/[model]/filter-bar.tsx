import { code, imp } from "ts-poet";

const useEffect = imp("useEffect@react")
const useMemo = imp("useMemo@react")
const useRef = imp("useRef@react")
const useState = imp("useState@react")
const Plus = imp("Plus@lucide-react")
const X = imp("X@lucide-react")
const ArrowUp = imp("ArrowUp@lucide-react")
const ArrowDown = imp("ArrowDown@lucide-react")
const ListFilter = imp("ListFilter@lucide-react")
const cn = imp("cn@@/lib/utils")
const Button = imp("Button@@/components/ui/button")
const Input = imp("Input@@/components/ui/input")
const Select = imp("Select@@/components/ui/select")
const SelectContent = imp("SelectContent@@/components/ui/select")
const SelectItem = imp("SelectItem@@/components/ui/select")
const SelectTrigger = imp("SelectTrigger@@/components/ui/select")
const SelectValue = imp("SelectValue@@/components/ui/select")
const useSchemas = imp("useSchemas@@/query/hooks/use-schemas")
const getFieldKind = imp("getFieldKind@@/lib/crud/resolve-filters")
const isFilterableField = imp("isFilterableField@@/lib/crud/resolve-filters")
const defaultOperatorForKind = imp("defaultOperatorForKind@@/lib/crud/resolve-filters")
const OPERATORS_BY_KIND = imp("OPERATORS_BY_KIND@@/lib/crud/resolve-filters")
const FieldKind = imp("t:FieldKind@@/lib/crud/resolve-filters")

export const writeFilterBar = () => code`
/** Radix Select requires non-empty string values; map "no selection" to this sentinel. */
const SELECT_EMPTY = "__acaraje_empty__";

interface FilterBarProps {
  model: string;
  filters: Crud.FilterCondition[];
  sortField: string;
  sortOrder: Crud.SortOrder;
  onFiltersChange: (next: Crud.FilterCondition[]) => void;
  onSortChange: (field: string, order: Crud.SortOrder) => void;
}

function defaultValueForKind(kind: ${FieldKind}, field: Schema.Field, enums: Schema.EnumType[]): string {
  if (kind === "boolean") return "true";
  if (kind === "enum") return enums.find((e) => e.name === field.type)?.values[0] ?? "";
  return "";
}

export function FilterBar({ model, filters, sortField, sortOrder, onFiltersChange, onSortChange }: FilterBarProps) {
  const { data: schemaData } = ${useSchemas}();
  const [localFilters, setLocalFilters] = ${useState}<Crud.FilterCondition[]>(filters);
  const debounceRef = ${useRef}<ReturnType<typeof setTimeout> | null>(null);

  ${useEffect}(() => {
    setLocalFilters(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  const modelDef = ${useMemo}(
    () => schemaData?.models?.find((m) => m.name.toLowerCase() === model.toLowerCase()) ?? null,
    [schemaData, model],
  );
  const enums = schemaData?.enums ?? [];
  const enumNames = ${useMemo}(() => new Set(enums.map((e) => e.name)), [enums]);

  const filterableFields = ${useMemo}(() => (modelDef?.fields ?? []).filter((f) => ${isFilterableField}(f, enumNames)), [modelDef, enumNames]);

  if (!modelDef || filterableFields.length === 0) return null;

  const pushFilters = (next: Crud.FilterCondition[]) => {
    setLocalFilters(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onFiltersChange(next), 300);
  };

  const addFilter = () => {
    const field = filterableFields[0];
    const kind = ${getFieldKind}(field.type, enumNames)!;
    pushFilters([
      ...localFilters,
      { field: field.name, operator: ${defaultOperatorForKind}(kind), value: defaultValueForKind(kind, field, enums) },
    ]);
  };

  const updateFilter = (index: number, patch: Partial<Crud.FilterCondition>) => {
    pushFilters(localFilters.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  };

  const removeFilter = (index: number) => {
    pushFilters(localFilters.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-wrap items-start gap-4">
      {/* Sort control */}
      <div className="flex items-center gap-1.5">
        <${Select} value={sortField || SELECT_EMPTY} onValueChange={(v) => onSortChange(v === SELECT_EMPTY ? "" : v, sortOrder)}>
          <${SelectTrigger} className="h-9 w-44 text-xs font-mono">
            <${SelectValue} placeholder="Sort by..." />
          </${SelectTrigger}>
          <${SelectContent}>
            <${SelectItem} value={SELECT_EMPTY}>Default (newest first)</${SelectItem}>
            {filterableFields.map((f) => (
              <${SelectItem} key={f.name} value={f.name}>
                {f.name}
              </${SelectItem}>
            ))}
          </${SelectContent}>
        </${Select}>
        {sortField && (
          <${Button}
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onSortChange(sortField, sortOrder === "asc" ? "desc" : "asc")}
            title={sortOrder === "asc" ? "Ascending" : "Descending"}
          >
            {sortOrder === "asc" ? <${ArrowUp} className="w-3.5 h-3.5" /> : <${ArrowDown} className="w-3.5 h-3.5" />}
          </${Button}>
        )}
      </div>

      {/* Filter rows */}
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {localFilters.map((filter, index) => {
          const field = filterableFields.find((f) => f.name === filter.field);
          const kind = field ? ${getFieldKind}(field.type, enumNames) : null;
          const enumDef = kind === "enum" && field ? enums.find((e) => e.name === field.type) : undefined;

          return (
            <div key={index} className="flex items-center gap-1 rounded-md border border-border/50 bg-card/40 p-1">
              <${Select}
                value={filter.field}
                onValueChange={(v) => {
                  const newField = filterableFields.find((f) => f.name === v)!;
                  const newKind = ${getFieldKind}(newField.type, enumNames)!;
                  updateFilter(index, {
                    field: v,
                    operator: ${defaultOperatorForKind}(newKind),
                    value: defaultValueForKind(newKind, newField, enums),
                  });
                }}
              >
                <${SelectTrigger} className="h-7 w-28 text-xs font-mono border-0 bg-transparent">
                  <${SelectValue} />
                </${SelectTrigger}>
                <${SelectContent}>
                  {filterableFields.map((f) => (
                    <${SelectItem} key={f.name} value={f.name}>
                      {f.name}
                    </${SelectItem}>
                  ))}
                </${SelectContent}>
              </${Select}>

              {kind && (
                <${Select} value={filter.operator} onValueChange={(v) => updateFilter(index, { operator: v as Crud.FilterOperator })}>
                  <${SelectTrigger} className="h-7 w-24 text-xs font-mono border-0 bg-transparent">
                    <${SelectValue} />
                  </${SelectTrigger}>
                  <${SelectContent}>
                    {${OPERATORS_BY_KIND}[kind].map((op) => (
                      <${SelectItem} key={op.value} value={op.value}>
                        {op.label}
                      </${SelectItem}>
                    ))}
                  </${SelectContent}>
                </${Select}>
              )}

              {kind === "boolean" && (
                <${Select} value={filter.value} onValueChange={(v) => updateFilter(index, { value: v })}>
                  <${SelectTrigger} className="h-7 w-20 text-xs font-mono border-0 bg-transparent">
                    <${SelectValue} />
                  </${SelectTrigger}>
                  <${SelectContent}>
                    <${SelectItem} value="true">true</${SelectItem}>
                    <${SelectItem} value="false">false</${SelectItem}>
                  </${SelectContent}>
                </${Select}>
              )}

              {kind === "enum" && enumDef && (
                <${Select} value={filter.value} onValueChange={(v) => updateFilter(index, { value: v })}>
                  <${SelectTrigger} className="h-7 w-28 text-xs font-mono border-0 bg-transparent">
                    <${SelectValue} />
                  </${SelectTrigger}>
                  <${SelectContent}>
                    {enumDef.values.map((v) => (
                      <${SelectItem} key={v} value={v}>
                        {v}
                      </${SelectItem}>
                    ))}
                  </${SelectContent}>
                </${Select}>
              )}

              {kind === "number" && (
                <${Input}
                  type="number"
                  value={filter.value}
                  onChange={(e) => updateFilter(index, { value: e.target.value })}
                  className="h-7 w-24 text-xs font-mono border-0 bg-transparent"
                />
              )}

              {kind === "datetime" && (
                <${Input}
                  type="datetime-local"
                  value={filter.value}
                  onChange={(e) => updateFilter(index, { value: e.target.value })}
                  className="h-7 w-44 text-xs font-mono border-0 bg-transparent"
                />
              )}

              {kind === "string" && (
                <${Input}
                  type="text"
                  value={filter.value}
                  onChange={(e) => updateFilter(index, { value: e.target.value })}
                  placeholder="value..."
                  className="h-7 w-32 text-xs font-mono border-0 bg-transparent"
                />
              )}

              <${Button}
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => removeFilter(index)}
                className="h-6 w-6 text-muted-foreground hover:text-red-400"
              >
                <${X} className="w-3 h-3" />
              </${Button}>
            </div>
          );
        })}

        <${Button}
          type="button"
          variant="outline"
          size="sm"
          onClick={addFilter}
          className={${cn}("h-9", localFilters.length === 0 && "text-muted-foreground/70")}
        >
          <${ListFilter} className="w-3.5 h-3.5" />
          <${Plus} className="w-3 h-3 -ml-1" />
          Add filter
        </${Button}>
      </div>
    </div>
  );
}
`.toString({ prefix: '"use client";' });

export default writeFilterBar;
