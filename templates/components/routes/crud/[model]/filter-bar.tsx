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
const Braces = imp("Braces@lucide-react")
const Link2 = imp("Link2@lucide-react")
const cn = imp("cn@@/lib/utils")
const Button = imp("Button@@/components/ui/button")
const Input = imp("Input@@/components/ui/input")
const Select = imp("Select@@/components/ui/select")
const SelectContent = imp("SelectContent@@/components/ui/select")
const SelectItem = imp("SelectItem@@/components/ui/select")
const SelectTrigger = imp("SelectTrigger@@/components/ui/select")
const SelectValue = imp("SelectValue@@/components/ui/select")
const useSchemas = imp("useSchemas@@/query/hooks/use-schemas")
const buildFilterSchema = imp("buildFilterSchema@@/lib/crud/resolve-filters")
const findModelConfig = imp("findModelConfig@@/lib/crud/resolve-filters")
const defaultOperatorForKind = imp("defaultOperatorForKind@@/lib/crud/resolve-filters")
const emptyFilterGroup = imp("emptyFilterGroup@@/lib/crud/resolve-filters")
const OPERATORS_BY_KIND = imp("OPERATORS_BY_KIND@@/lib/crud/resolve-filters")
const MAX_FILTER_DEPTH = imp("MAX_FILTER_DEPTH@@/lib/crud/resolve-filters")
const toFilterDateTime = imp("toFilterDateTime@@/lib/crud/resolve-filters")
const fromFilterDateTime = imp("fromFilterDateTime@@/lib/crud/resolve-filters")
const FilterSchema = imp("t:FilterSchema@@/lib/crud/resolve-filters")
const ModelFilterConfig = imp("t:ModelFilterConfig@@/lib/crud/resolve-filters")

export const writeFilterBar = () => code`
/** Radix Select requires non-empty string values; map "no selection" to this sentinel. */
const SELECT_EMPTY = "__acaraje_empty__";

const TRIGGER = "h-7 text-xs font-mono border-0 bg-transparent";

interface FilterBarProps {
  model: string;
  filters: Crud.FilterGroup;
  sortField: string;
  sortOrder: Crud.SortOrder;
  onFiltersChange: (next: Crud.FilterGroup) => void;
  onSortChange: (field: string, order: Crud.SortOrder) => void;
}

/** A new condition on 'field', with the kind's first operator and a sensible starting value. */
function newCondition(config: ${ModelFilterConfig}, field: string): Crud.FilterCondition {
  const kind = config.fieldKinds[field];
  const value = kind === "boolean" ? "true" : kind === "enum" ? (config.enumValues[field]?.[0] ?? "") : "";
  return { field, operator: ${defaultOperatorForKind}(kind), value };
}

export function FilterBar({ model, filters, sortField, sortOrder, onFiltersChange, onSortChange }: FilterBarProps) {
  const { data: schemaData } = ${useSchemas}();
  const [localFilters, setLocalFilters] = ${useState}<Crud.FilterGroup>(filters);
  const debounceRef = ${useRef}<ReturnType<typeof setTimeout> | null>(null);

  ${useEffect}(() => {
    setLocalFilters(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  // The same derivation the list endpoints run on the generated parsed schema.
  const filterSchema = ${useMemo}(() => (schemaData ? ${buildFilterSchema}(schemaData) : null), [schemaData]);
  const found = filterSchema ? ${findModelConfig}(filterSchema, model) : null;

  if (!filterSchema || !found) return null;
  const sortableFields = Object.keys(found.config.fieldKinds);
  if (sortableFields.length === 0 && Object.keys(found.config.relations).length === 0) return null;

  const pushFilters = (next: Crud.FilterGroup) => {
    setLocalFilters(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onFiltersChange(next), 300);
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
            {sortableFields.map((f) => (
              <${SelectItem} key={f} value={f}>
                {f}
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

      <div className="flex-1">
        <FilterGroupEditor schema={filterSchema} model={found.name} group={localFilters} depth={0} onChange={pushFilters} />
      </div>
    </div>
  );
}

interface GroupEditorProps {
  schema: ${FilterSchema};
  model: string;
  group: Crud.FilterGroup;
  depth: number;
  onChange: (next: Crud.FilterGroup) => void;
  onRemove?: () => void;
}

/** A group's children joined by all/any, optionally negated; groups and relations nest. */
function FilterGroupEditor({ schema, model, group, depth, onChange, onRemove }: GroupEditorProps) {
  const config = schema.models[model];
  const fields = Object.keys(config.fieldKinds);
  const relations = Object.values(config.relations);
  const canNest = depth + 1 < ${MAX_FILTER_DEPTH};

  const setChild = (index: number, next: Crud.FilterNode | null) =>
    onChange({
      ...group,
      children: next === null ? group.children.filter((_, i) => i !== index) : group.children.map((c, i) => (i === index ? next : c)),
    });
  const addChild = (child: Crud.FilterNode) => onChange({ ...group, children: [...group.children, child] });

  const showHeader = depth > 0 || group.children.length > 1 || !!group.not;

  return (
    <div className={${cn}("flex flex-wrap items-center gap-2", depth > 0 && "rounded-md border border-dashed border-border/60 p-1.5")}>
      {showHeader && (
        <div className="flex items-center gap-1">
          <${Button}
            type="button"
            variant={group.not ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2 text-xs font-mono"
            onClick={() => onChange({ ...group, not: !group.not })}
            title="Negate this group"
          >
            NOT
          </${Button}>
          <${Select} value={group.combinator} onValueChange={(v) => onChange({ ...group, combinator: v as "and" | "or" })}>
            <${SelectTrigger} className={${cn}(TRIGGER, "w-24")}>
              <${SelectValue} />
            </${SelectTrigger}>
            <${SelectContent}>
              <${SelectItem} value="and">match all</${SelectItem}>
              <${SelectItem} value="or">match any</${SelectItem}>
            </${SelectContent}>
          </${Select}>
        </div>
      )}

      {group.children.map((child, index) =>
        child.type === "group" ? (
          <FilterGroupEditor
            key={index}
            schema={schema}
            model={model}
            group={child}
            depth={depth + 1}
            onChange={(next) => setChild(index, next)}
            onRemove={() => setChild(index, null)}
          />
        ) : child.type === "relation" ? (
          <RelationFilterEditor
            key={index}
            schema={schema}
            model={model}
            filter={child}
            depth={depth + 1}
            onChange={(next) => setChild(index, next)}
            onRemove={() => setChild(index, null)}
          />
        ) : (
          <ConditionEditor
            key={index}
            config={config}
            condition={child}
            onChange={(next) => setChild(index, next)}
            onRemove={() => setChild(index, null)}
          />
        ),
      )}

      {fields.length > 0 && (
        <${Button}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addChild(newCondition(config, fields[0]))}
          className={${cn}(depth === 0 ? "h-9" : "h-7", group.children.length === 0 && "text-muted-foreground/70")}
        >
          <${ListFilter} className="w-3.5 h-3.5" />
          <${Plus} className="w-3 h-3 -ml-1" />
          Add filter
        </${Button}>
      )}
      {canNest && (
        <${Button}
          type="button"
          variant="ghost"
          size="sm"
          className={depth === 0 ? "h-9" : "h-7"}
          onClick={() => addChild({ type: "group", combinator: "or", children: [] })}
          title="Add a nested group"
        >
          <${Braces} className="w-3.5 h-3.5" />
          Group
        </${Button}>
      )}
      {canNest && relations.length > 0 && (
        <${Button}
          type="button"
          variant="ghost"
          size="sm"
          className={depth === 0 ? "h-9" : "h-7"}
          onClick={() => addChild({ type: "relation", relation: relations[0].name, mode: "some", where: ${emptyFilterGroup}() })}
          title="Filter by related records"
        >
          <${Link2} className="w-3.5 h-3.5" />
          Related
        </${Button}>
      )}
      {onRemove && <RemoveButton onClick={onRemove} />}
    </div>
  );
}

interface RelationEditorProps {
  schema: ${FilterSchema};
  model: string;
  filter: Crud.RelationFilter;
  depth: number;
  onChange: (next: Crud.RelationFilter) => void;
  onRemove: () => void;
}

const COLLECTION_MODES: { value: Crud.RelationFilter["mode"]; label: string; empty: string }[] = [
  { value: "some", label: "has any", empty: "is not empty" },
  { value: "every", label: "all match", empty: "(any)" },
  { value: "none", label: "has none", empty: "is empty" },
];
const SINGLE_MODES: { value: Crud.RelationFilter["mode"]; label: string; empty: string }[] = [
  { value: "some", label: "matches", empty: "is set" },
  { value: "none", label: "doesn't match", empty: "is not set" },
];

/** Conditions on related records: the relation, how many must match, then a group on the related model. */
function RelationFilterEditor({ schema, model, filter, depth, onChange, onRemove }: RelationEditorProps) {
  const relations = schema.models[model].relations;
  const relation = relations[filter.relation];
  const modes = relation?.many ? COLLECTION_MODES : SINGLE_MODES;
  const where = filter.where ?? ${emptyFilterGroup}();

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-md border border-border/50 bg-card/40 p-1">
      <${Select}
        value={filter.relation}
        onValueChange={(v) => onChange({ type: "relation", relation: v, mode: "some", where: ${emptyFilterGroup}() })}
      >
        <${SelectTrigger} className={${cn}(TRIGGER, "w-36")}>
          <${SelectValue} />
        </${SelectTrigger}>
        <${SelectContent}>
          {Object.values(relations).map((r) => (
            <${SelectItem} key={r.name} value={r.name}>
              {r.label}
            </${SelectItem}>
          ))}
        </${SelectContent}>
      </${Select}>

      {relation && (
        <${Select} value={filter.mode} onValueChange={(v) => onChange({ ...filter, mode: v as Crud.RelationFilter["mode"] })}>
          <${SelectTrigger} className={${cn}(TRIGGER, "w-28")}>
            <${SelectValue} />
          </${SelectTrigger}>
          <${SelectContent}>
            {modes.map((m) => (
              <${SelectItem} key={m.value} value={m.value}>
                {m.label}
              </${SelectItem}>
            ))}
          </${SelectContent}>
        </${Select}>
      )}

      {relation && where.children.length === 0 && (
        <span className="px-1 text-xs text-muted-foreground">{modes.find((m) => m.value === filter.mode)?.empty}</span>
      )}

      {relation && (
        <FilterGroupEditor
          schema={schema}
          model={relation.target}
          group={where}
          depth={depth}
          onChange={(next) => onChange({ ...filter, where: next })}
        />
      )}

      <RemoveButton onClick={onRemove} />
    </div>
  );
}

interface ConditionEditorProps {
  config: ${ModelFilterConfig};
  condition: Crud.FilterCondition;
  onChange: (next: Crud.FilterCondition) => void;
  onRemove: () => void;
}

/** One field/operator/value row. */
function ConditionEditor({ config, condition, onChange, onRemove }: ConditionEditorProps) {
  const fields = Object.keys(config.fieldKinds);
  const kind = config.fieldKinds[condition.field] ?? null;
  const enumValues = kind === "enum" ? (config.enumValues[condition.field] ?? []) : [];

  return (
    <div className="flex items-center gap-1 rounded-md border border-border/50 bg-card/40 p-1">
      <${Select} value={condition.field} onValueChange={(v) => onChange(newCondition(config, v))}>
        <${SelectTrigger} className={${cn}(TRIGGER, "w-28")}>
          <${SelectValue} />
        </${SelectTrigger}>
        <${SelectContent}>
          {fields.map((f) => (
            <${SelectItem} key={f} value={f}>
              {f}
            </${SelectItem}>
          ))}
        </${SelectContent}>
      </${Select}>

      {kind && (
        <${Select} value={condition.operator} onValueChange={(v) => onChange({ ...condition, operator: v as Crud.FilterOperator })}>
          <${SelectTrigger} className={${cn}(TRIGGER, "w-24")}>
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
        <${Select} value={condition.value} onValueChange={(v) => onChange({ ...condition, value: v })}>
          <${SelectTrigger} className={${cn}(TRIGGER, "w-20")}>
            <${SelectValue} />
          </${SelectTrigger}>
          <${SelectContent}>
            <${SelectItem} value="true">true</${SelectItem}>
            <${SelectItem} value="false">false</${SelectItem}>
          </${SelectContent}>
        </${Select}>
      )}

      {kind === "enum" && enumValues.length > 0 && (
        <${Select} value={condition.value} onValueChange={(v) => onChange({ ...condition, value: v })}>
          <${SelectTrigger} className={${cn}(TRIGGER, "w-28")}>
            <${SelectValue} />
          </${SelectTrigger}>
          <${SelectContent}>
            {enumValues.map((v) => (
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
          value={condition.value}
          onChange={(e) => onChange({ ...condition, value: e.target.value })}
          className={${cn}(TRIGGER, "w-24")}
        />
      )}

      {/* Shown in local time, sent as a UTC instant so the server needn't know the timezone. */}
      {kind === "datetime" && (
        <${Input}
          type="datetime-local"
          value={${fromFilterDateTime}(condition.value)}
          onChange={(e) => onChange({ ...condition, value: ${toFilterDateTime}(e.target.value) })}
          className={${cn}(TRIGGER, "w-44")}
        />
      )}

      {kind === "string" && (
        <${Input}
          type="text"
          value={condition.value}
          onChange={(e) => onChange({ ...condition, value: e.target.value })}
          placeholder="value..."
          className={${cn}(TRIGGER, "w-32")}
        />
      )}

      <RemoveButton onClick={onRemove} />
    </div>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <${Button}
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={onClick}
      className="h-6 w-6 text-muted-foreground hover:text-red-400"
    >
      <${X} className="w-3 h-3" />
    </${Button}>
  );
}
`.toString({ prefix: '"use client";' });

export default writeFilterBar;
