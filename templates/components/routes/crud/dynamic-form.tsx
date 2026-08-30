import { code, imp } from "ts-poet";

const useMemo = imp("useMemo@react")
const useState = imp("useState@react")
const useForm = imp("useForm@@tanstack/react-form")
const cn = imp("cn@@/lib/utils")
const getEnumValues = imp("getEnumValues@@/lib/enum-values")
const Button = imp("Button@@/components/ui/button")
const Input = imp("Input@@/components/ui/input")
const Select = imp("Select@@/components/ui/select")
const SelectContent = imp("SelectContent@@/components/ui/select")
const SelectItem = imp("SelectItem@@/components/ui/select")
const SelectTrigger = imp("SelectTrigger@@/components/ui/select")
const SelectValue = imp("SelectValue@@/components/ui/select")
const Loader2 = imp("Loader2@lucide-react")
const Search = imp("Search@lucide-react")
const useCrudOptionsInfinite = imp("useCrudOptionsInfinite@@/query/hooks/use-crud")
const buildFormSchema = imp("buildFormSchema@@/lib/crud/build-form-schema")
const coerceFormValues = imp("coerceFormValues@@/lib/crud/build-form-schema")
const editableFields = imp("editableFields@@/lib/crud/build-form-schema")
const formKey = imp("formKey@@/lib/crud/build-form-schema")

export const writeDynamicForm = () => code`
/** Radix Select requires non-empty string values; map empty selection to this sentinel. */
const SELECT_EMPTY = "__acaraje_empty__";

interface DynamicFormProps {
  modelName: string;
  fields: Schema.Field[];
  enums: Schema.EnumType[];
  initialData?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-mono text-muted-foreground mb-1.5">
      {children}
      {required && <span className="text-rose-custom ml-1">*</span>}
    </label>
  );
}

const inputClass = "font-mono";

function fieldErrorMessage(errors: unknown[]): string | null {
  const [first] = errors;
  if (first === undefined) return null;
  if (typeof first === "string") return first;
  if (first && typeof first === "object" && "message" in (first as any)) return String((first as any).message);
  return "Invalid value";
}

function FieldError({ errors }: { errors: unknown[] }) {
  const message = fieldErrorMessage(errors);
  if (!message) return null;
  return <p className="text-xs text-rose-custom mt-1">{message}</p>;
}

function buildDefaultValues(fields: Schema.Field[], initialData?: Record<string, any>): Record<string, any> {
  const values: Record<string, any> = {};
  for (const field of ${editableFields}(fields)) {
    const key = ${formKey}(field);
    if (field.type === "Boolean") {
      values[key] = initialData?.[key] === true || initialData?.[key] === "true";
      continue;
    }
    const raw = initialData?.[key];
    if (raw === undefined || raw === null) {
      values[key] = "";
      continue;
    }
    if (field.type === "DateTime") {
      const d = new Date(raw);
      values[key] = Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 16);
    } else {
      values[key] = raw;
    }
  }
  return values;
}

/** Relation fields render as a Select whose options come from the target model's CRUD options
 *  endpoint — split out so the \`useCrudOptions\` hook has a stable component to live in (it can't
 *  be called from inside the field-rendering .map() in the parent). */
function RelationField({ field, form }: { field: Schema.Field; form: any }) {
  const key = ${formKey}(field);
  const [searchInput, setSearchInput] = ${useState}("");
  const [search, setSearch] = ${useState}("");

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = ${useCrudOptionsInfinite}(field.type, search);
  const opts = ${useMemo}(() => data?.pages.flatMap((p) => p.options) ?? [], [data]);

  const confirmSearch = () => setSearch(searchInput.trim());

  const handleViewportScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    if (nearBottom && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  return (
    <form.Field name={key}>
      {(f: any) => {
        const fkVal = f.state.value ?? "";
        const selectValue = fkVal === "" ? SELECT_EMPTY : String(fkVal);
        return (
          <div>
            <Label required={field.isRequired}>{field.name}</Label>
            <${Select}
              value={selectValue}
              onValueChange={(v) => f.handleChange(v === SELECT_EMPTY ? "" : v)}
              onOpenChange={(open) => {
                if (!open) {
                  setSearchInput("");
                  setSearch("");
                }
              }}
            >
              <${SelectTrigger} className={${cn}(inputClass, "w-full")}>
                <${SelectValue} placeholder={\`— select \${field.type} —\`} />
              </${SelectTrigger}>
              <${SelectContent} onViewportScroll={handleViewportScroll}>
                <div
                  className="flex items-center gap-1 px-1 pb-1.5 mb-1 border-b border-border/50"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      confirmSearch();
                      return;
                    }
                    if (e.key !== "Escape" && e.key !== "Tab") {
                      e.stopPropagation();
                    }
                  }}
                >
                  <${Input}
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search..."
                    className={${cn}(inputClass, "h-7 text-xs")}
                  />
                  <${Button}
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="h-7 w-7 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmSearch();
                    }}
                    aria-label="Search"
                  >
                    <${Search} className="h-3.5 w-3.5" />
                  </${Button}>
                </div>
                <${SelectItem} value={SELECT_EMPTY}>— select {field.type} —</${SelectItem}>
                {opts.map((o) => (
                  <${SelectItem} key={o.value} value={String(o.value)}>
                    {o.label}
                  </${SelectItem}>
                ))}
                {isFetchingNextPage && (
                  <div className="py-1.5 text-center text-xs text-muted-foreground">Loading…</div>
                )}
                {!isFetchingNextPage && opts.length === 0 && (
                  <div className="py-1.5 text-center text-xs text-muted-foreground">No results</div>
                )}
              </${SelectContent}>
            </${Select}>
            <FieldError errors={f.state.meta.errors} />
          </div>
        );
      }}
    </form.Field>
  );
}

export function DynamicForm({ modelName, fields, enums, initialData, onSubmit, onCancel, isLoading }: DynamicFormProps) {
  const fieldList = ${useMemo}(() => ${editableFields}(fields), [fields]);
  const schema = ${useMemo}(() => ${buildFormSchema}(fields, enums), [fields, enums]);
  const defaultValues = ${useMemo}(() => buildDefaultValues(fields, initialData), [fields, initialData]);

  const form = ${useForm}({
    defaultValues,
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      await onSubmit(${coerceFormValues}(fields, value));
    },
  });

  const renderField = (field: Schema.Field) => {
    const key = ${formKey}(field);

    if (field.isRelation) {
      return <RelationField key={field.name} field={field} form={form} />;
    }

    const enumValues = ${getEnumValues}(field, enums);
    if (enumValues) {
      return (
        <form.Field key={key} name={key}>
          {(f: any) => {
            const val = f.state.value ?? "";
            const selectValue = val === "" ? SELECT_EMPTY : String(val);
            return (
              <div>
                <Label required={field.isRequired}>{field.name}</Label>
                <${Select} value={selectValue} onValueChange={(v) => f.handleChange(v === SELECT_EMPTY ? "" : v)}>
                  <${SelectTrigger} className={${cn}(inputClass, "w-full")}>
                    <${SelectValue} placeholder="— select —" />
                  </${SelectTrigger}>
                  <${SelectContent}>
                    <${SelectItem} value={SELECT_EMPTY}>— select —</${SelectItem}>
                    {enumValues.map((v) => (
                      <${SelectItem} key={v} value={v}>
                        {v}
                      </${SelectItem}>
                    ))}
                  </${SelectContent}>
                </${Select}>
                <FieldError errors={f.state.meta.errors} />
              </div>
            );
          }}
        </form.Field>
      );
    }

    if (field.type === "Boolean") {
      return (
        <form.Field key={key} name={key}>
          {(f: any) => (
            <div className="flex items-center gap-3">
              <${Button}
                type="button"
                variant="ghost"
                onClick={() => f.handleChange(!f.state.value)}
                className={${cn}(
                  "relative w-9 h-5 rounded-full p-0 transition-colors border",
                  f.state.value ? "bg-primary-foreground/20 border-primary-foreground/50" : "bg-secondary border-border/50",
                )}
              >
                <span
                  className={${cn}(
                    "absolute top-0.5 w-4 h-4 rounded-full transition-all",
                    f.state.value ? "left-4 bg-primary-foreground" : "left-0.5 bg-muted-foreground/40",
                  )}
                />
              </${Button}>
              <Label>{field.name}</Label>
            </div>
          )}
        </form.Field>
      );
    }

    if (field.type === "DateTime") {
      return (
        <form.Field key={key} name={key}>
          {(f: any) => (
            <div>
              <Label required={field.isRequired}>{field.name}</Label>
              <${Input}
                type="datetime-local"
                value={f.state.value ?? ""}
                onChange={(e) => f.handleChange(e.target.value)}
                className={inputClass}
              />
              <FieldError errors={f.state.meta.errors} />
            </div>
          )}
        </form.Field>
      );
    }

    if (["Int", "Float", "Decimal"].includes(field.type)) {
      return (
        <form.Field key={key} name={key}>
          {(f: any) => (
            <div>
              <Label required={field.isRequired}>{field.name}</Label>
              <${Input}
                type="number"
                step={field.type === "Int" ? "1" : "0.01"}
                value={f.state.value ?? ""}
                onChange={(e) => f.handleChange(e.target.value)}
                placeholder={\`0\${field.type !== "Int" ? ".00" : ""}\`}
                className={inputClass}
              />
              <FieldError errors={f.state.meta.errors} />
            </div>
          )}
        </form.Field>
      );
    }

    if (field.type === "Json") {
      return (
        <form.Field key={key} name={key}>
          {(f: any) => {
            const raw = f.state.value;
            return (
              <div>
                <Label required={field.isRequired}>
                  {field.name} <span className="text-muted-foreground/50">(JSON)</span>
                </Label>
                <textarea
                  rows={3}
                  value={typeof raw === "object" && raw !== null ? JSON.stringify(raw, null, 2) : (raw ?? "")}
                  onChange={(e) => f.handleChange(e.target.value)}
                  placeholder='{"key": "value"}'
                  className={${cn}(inputClass, "resize-none font-mono text-xs")}
                />
              </div>
            );
          }}
        </form.Field>
      );
    }

    const isTextarea = ["description", "body", "notes", "content", "bio"].some((k) => field.name.toLowerCase().includes(k));
    if (isTextarea) {
      return (
        <form.Field key={key} name={key}>
          {(f: any) => (
            <div>
              <Label required={field.isRequired}>{field.name}</Label>
              <textarea
                rows={3}
                value={f.state.value ?? ""}
                onChange={(e) => f.handleChange(e.target.value)}
                placeholder={\`Enter \${field.name}...\`}
                className={${cn}(inputClass, "resize-none")}
              />
            </div>
          )}
        </form.Field>
      );
    }

    const isPassword = field.name.toLowerCase().includes("password") || field.name.toLowerCase().includes("hash");
    return (
      <form.Field key={key} name={key}>
        {(f: any) => (
          <div>
            <Label required={field.isRequired}>{field.name}</Label>
            <${Input}
              type={isPassword ? "password" : "text"}
              value={f.state.value ?? ""}
              onChange={(e) => f.handleChange(e.target.value)}
              placeholder={\`Enter \${field.name}...\`}
              className={inputClass}
            />
            <FieldError errors={f.state.meta.errors} />
          </div>
        )}
      </form.Field>
    );
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{fieldList.map(renderField)}</div>
      <div className="flex items-center gap-3 pt-4 border-t border-border/50">
        <form.Subscribe selector={(state: any) => state.isSubmitting}>
          {(isSubmitting: boolean) => (
            <${Button}
              type="submit"
              variant="outline"
              disabled={isLoading || isSubmitting}
              className="bg-primary-foreground/10 border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/20"
            >
              {(isLoading || isSubmitting) && <${Loader2} className="w-3.5 h-3.5 animate-spin" />}
              {initialData ? "Save Changes" : "Create Record"}
            </${Button}>
          )}
        </form.Subscribe>
        <${Button} type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </${Button}>
      </div>
    </form>
  );
}
`.toString({ prefix: '"use client";' });

export default writeDynamicForm;
