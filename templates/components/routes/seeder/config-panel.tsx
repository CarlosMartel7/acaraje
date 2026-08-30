import { code, imp } from "ts-poet";

const useEffect = imp("useEffect@react")
const useMemo = imp("useMemo@react")
const useState = imp("useState@react")
const createPortal = imp("createPortal@react-dom")
const X = imp("X@lucide-react")
const Settings2 = imp("Settings2@lucide-react")
const cn = imp("cn@@/lib/utils")
const Button = imp("Button@@/components/ui/button")
const Card = imp("Card@@/components/ui/card")
const Input = imp("Input@@/components/ui/input")
const Select = imp("Select@@/components/ui/select")
const SelectContent = imp("SelectContent@@/components/ui/select")
const SelectItem = imp("SelectItem@@/components/ui/select")
const SelectTrigger = imp("SelectTrigger@@/components/ui/select")
const SelectValue = imp("SelectValue@@/components/ui/select")
const allowedGeneratorKinds = imp("allowedGeneratorKinds@@/lib/seeder/field-generators")
const allowedKindsForOverrideType = imp("allowedKindsForOverrideType@@/lib/seeder/field-generators")
const emptyRuleForKind = imp("emptyRuleForKind@@/lib/seeder/field-generators")
const emptyRuleForOverrideType = imp("emptyRuleForOverrideType@@/lib/seeder/field-generators")
const fakerPresetsForField = imp("fakerPresetsForField@@/lib/seeder/field-generators")
const fakerPresetsForOverrideType = imp("fakerPresetsForOverrideType@@/lib/seeder/field-generators")
const generatorKindOptions = imp("generatorKindOptions@@/lib/seeder/field-generators")
const generatorKindOptionsForOverrideType = imp("generatorKindOptionsForOverrideType@@/lib/seeder/field-generators")
const isSeedableField = imp("isSeedableField@@/lib/seeder/field-generators")
const isValidFieldRule = imp("isValidFieldRule@@/lib/seeder/field-generators")
const OVERRIDE_TYPE_OPTIONS = imp("OVERRIDE_TYPE_OPTIONS@@/lib/seeder/field-generators")
const sanitizeFieldRule = imp("sanitizeFieldRule@@/lib/seeder/field-generators")

export const writeSeederConfigPanelComponent = () => code`
function GeneratorKindSelect({
  kindOptions,
  kind,
  onSelect,
}: {
  kindOptions: { value: Seeder.GeneratorKind; label: string }[];
  kind: Seeder.GeneratorKind;
  onSelect: (kind: Seeder.GeneratorKind) => void;
}) {
  return (
    <${Select} value={kind} onValueChange={(v) => onSelect(v as Seeder.GeneratorKind)}>
      <${SelectTrigger} className="h-7 w-[9.5rem] text-[10px]">
        <${SelectValue} />
      </${SelectTrigger}>
      <${SelectContent}>
        {kindOptions.map((g) => (
          <${SelectItem} key={g.value} value={g.value}>
            {g.label}
          </${SelectItem}>
        ))}
      </${SelectContent}>
    </${Select}>
  );
}

/** Renders the sub-fields for whichever generator kind is selected. Shared by real fields and override types. */
function GeneratorFields({
  effectiveType,
  fakerPresets,
  enumValues,
  rule,
  onChange,
}: {
  effectiveType: string;
  fakerPresets: { path: string; label: string }[];
  enumValues?: string[];
  rule: Seeder.FieldGenerator | undefined;
  onChange: (rule: Seeder.FieldGenerator | undefined) => void;
}) {
  return (
    <>
      {rule?.kind === "faker" && fakerPresets.length > 0 && (
        <${Select} value={rule.path} onValueChange={(path) => onChange({ kind: "faker", path })}>
          <${SelectTrigger} className="h-7 text-[10px]">
            <${SelectValue} placeholder="Faker path..." />
          </${SelectTrigger}>
          <${SelectContent}>
            {fakerPresets.map((p) => (
              <${SelectItem} key={p.path} value={p.path}>
                {p.label} ({p.path})
              </${SelectItem}>
            ))}
          </${SelectContent}>
        </${Select}>
      )}

      {rule?.kind === "int" && (
        <div className="grid grid-cols-2 gap-2">
          <${Input}
            type="number"
            value={rule.min ?? 0}
            onChange={(e) => onChange({ ...rule, min: Number(e.target.value) })}
            placeholder="Min"
            className="h-7 text-[10px]"
          />
          <${Input}
            type="number"
            value={rule.max ?? 100}
            onChange={(e) => onChange({ ...rule, max: Number(e.target.value) })}
            placeholder="Max"
            className="h-7 text-[10px]"
          />
        </div>
      )}

      {rule?.kind === "float" && (
        <div className="grid grid-cols-3 gap-2">
          <${Input}
            type="number"
            value={rule.min ?? 0}
            onChange={(e) => onChange({ ...rule, min: Number(e.target.value) })}
            placeholder="Min"
            className="h-7 text-[10px]"
          />
          <${Input}
            type="number"
            value={rule.max ?? 100}
            onChange={(e) => onChange({ ...rule, max: Number(e.target.value) })}
            placeholder="Max"
            className="h-7 text-[10px]"
          />
          <${Input}
            type="number"
            value={rule.fractionDigits ?? 2}
            onChange={(e) => onChange({ ...rule, fractionDigits: Number(e.target.value) })}
            placeholder="Decimals"
            className="h-7 text-[10px]"
          />
        </div>
      )}

      {rule?.kind === "boolean" && (
        <div className="grid grid-cols-2 gap-2">
          <${Select}
            value={rule.value === undefined ? "random" : rule.value ? "true" : "false"}
            onValueChange={(v) => {
              if (v === "random") onChange({ kind: "boolean", trueChance: rule.trueChance ?? 0.5 });
              else onChange({ kind: "boolean", value: v === "true" });
            }}
          >
            <${SelectTrigger} className="h-7 text-[10px]">
              <${SelectValue} />
            </${SelectTrigger}>
            <${SelectContent}>
              <${SelectItem} value="random">Random</${SelectItem}>
              <${SelectItem} value="true">Always true</${SelectItem}>
              <${SelectItem} value="false">Always false</${SelectItem}>
            </${SelectContent}>
          </${Select}>
          {rule.value === undefined && (
            <${Input}
              type="number"
              min={0}
              max={100}
              value={Math.round((rule.trueChance ?? 0.5) * 100)}
              onChange={(e) =>
                onChange({ kind: "boolean", trueChance: Math.min(1, Math.max(0, Number(e.target.value) / 100)) })
              }
              placeholder="% true"
              className="h-7 text-[10px]"
            />
          )}
        </div>
      )}

      {rule?.kind === "enum" && enumValues && (
        <${Input}
          value={(rule.values ?? []).join(", ")}
          onChange={(e) => {
            const values = e.target.value
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean);
            onChange({ kind: "enum", values: values.length ? values : undefined });
          }}
          placeholder={\`All values, or subset: \${enumValues.join(", ")}\`}
          className="h-7 text-[10px] font-mono"
        />
      )}

      {rule?.kind === "fixed" && effectiveType === "Boolean" && (
        <${Select}
          value={rule.value === true ? "true" : rule.value === false ? "false" : "true"}
          onValueChange={(v) => onChange({ kind: "fixed", value: v === "true" })}
        >
          <${SelectTrigger} className="h-7 text-[10px]">
            <${SelectValue} />
          </${SelectTrigger}>
          <${SelectContent}>
            <${SelectItem} value="true">true</${SelectItem}>
            <${SelectItem} value="false">false</${SelectItem}>
          </${SelectContent}>
        </${Select}>
      )}

      {rule?.kind === "fixed" && effectiveType !== "Boolean" && (
        <${Input}
          value={String(rule.value ?? "")}
          onChange={(e) => onChange({ kind: "fixed", value: e.target.value })}
          placeholder={
            effectiveType === "Json"
              ? '{"key": "value"}'
              : effectiveType === "Int" || effectiveType === "BigInt"
                ? "42"
                : effectiveType === "Float" || effectiveType === "Decimal"
                  ? "3.14"
                  : "Literal value"
          }
          className="h-7 text-[10px] font-mono"
        />
      )}
    </>
  );
}

function RuleEditor({
  field,
  schema,
  enumValues,
  rule,
  onChange,
}: {
  field: Schema.Field;
  schema: Schema.SchemaData;
  enumValues?: string[];
  rule: Seeder.FieldGenerator | undefined;
  onChange: (rule: Seeder.FieldGenerator | undefined) => void;
}) {
  const kinds = ${generatorKindOptions}(field, schema);
  const allowed = new Set(${allowedGeneratorKinds}(field, schema));
  const rawKind = rule?.kind ?? "default";
  const kind = allowed.has(rawKind) ? rawKind : "default";
  const fakerPresets = ${fakerPresetsForField}(field, schema);

  return (
    <div className="space-y-2 rounded border border-border/40 p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="text-xs font-mono font-medium">{field.name}</span>
          <span className="text-[10px] text-muted-foreground ml-2">{field.type}</span>
        </div>
        <GeneratorKindSelect
          kindOptions={kinds}
          kind={kind}
          onSelect={(v) => {
            if (v === "default") onChange(undefined);
            else onChange(${emptyRuleForKind}(v, field, schema));
          }}
        />
      </div>

      <GeneratorFields
        effectiveType={field.type}
        fakerPresets={fakerPresets}
        enumValues={enumValues}
        rule={rule}
        onChange={onChange}
      />

      {rule?.kind === "override" && (
        <div className="ml-3 space-y-2 border-l-2 border-border/60 pl-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-muted-foreground">Override type</span>
            <${Select}
              value={rule.overrideType}
              onValueChange={(v) =>
                onChange({ kind: "override", overrideType: v as Seeder.OverrideType })
              }
            >
              <${SelectTrigger} className="h-7 w-[9.5rem] text-[10px]">
                <${SelectValue} />
              </${SelectTrigger}>
              <${SelectContent}>
                {${OVERRIDE_TYPE_OPTIONS}.map((t) => (
                  <${SelectItem} key={t.value} value={t.value}>
                    {t.label}
                  </${SelectItem}>
                ))}
              </${SelectContent}>
            </${Select}>
          </div>

          {rule.overrideType === "Enum" && (
            <${Input}
              value={(rule.enumValues ?? []).join(", ")}
              onChange={(e) => {
                const values = e.target.value
                  .split(",")
                  .map((v) => v.trim())
                  .filter(Boolean);
                onChange({ ...rule, enumValues: values.length ? values : undefined });
              }}
              placeholder="Comma-separated values to pick from"
              className="h-7 text-[10px] font-mono"
            />
          )}

          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-muted-foreground">Generator</span>
            <GeneratorKindSelect
              kindOptions={${generatorKindOptionsForOverrideType}(rule.overrideType)}
              kind={
                rule.rule && ${allowedKindsForOverrideType}(rule.overrideType).includes(rule.rule.kind)
                  ? rule.rule.kind
                  : "default"
              }
              onSelect={(v) => {
                if (v === "default") onChange({ ...rule, rule: undefined });
                else onChange({ ...rule, rule: ${emptyRuleForOverrideType}(v, rule.overrideType) });
              }}
            />
          </div>

          <GeneratorFields
            effectiveType={rule.overrideType}
            fakerPresets={${fakerPresetsForOverrideType}(rule.overrideType)}
            enumValues={rule.overrideType === "Enum" ? rule.enumValues : undefined}
            rule={rule.rule}
            onChange={(nested) => onChange({ ...rule, rule: nested as Seeder.BaseGenerator | undefined })}
          />
        </div>
      )}
    </div>
  );
}

export function SeederConfigPanel({
  schema,
  config,
  modelName,
  onClose,
  onSaved,
}: {
  schema: Schema.SchemaData;
  config: Seeder.ConfigFile;
  modelName: string;
  onClose: () => void;
  onSaved: (config: Seeder.ConfigFile) => void;
}) {
  const [mounted, setMounted] = ${useState}(false);
  const [draft, setDraft] = ${useState}<Seeder.ConfigFile>(config);
  const [saving, setSaving] = ${useState}(false);
  const [error, setError] = ${useState}<string | null>(null);

  ${useEffect}(() => setMounted(true), []);

  const model = ${useMemo}(
    () => schema.models.find((m) => m.name === modelName) ?? null,
    [schema.models, modelName],
  );

  const seedableFields = ${useMemo}(
    () => model?.fields.filter(${isSeedableField}) ?? [],
    [model],
  );

  const modelRules = draft.models[modelName] ?? {};

  const setFieldRule = (fieldName: string, rule: Seeder.FieldGenerator | undefined) => {
    const field = model?.fields.find((f) => f.name === fieldName);
    if (!field) return;
    const sanitized = ${sanitizeFieldRule}(field, schema, rule);
    setDraft((prev) => {
      const nextModels = { ...prev.models };
      const rules = { ...(nextModels[modelName] ?? {}) };
      if (!sanitized) {
        delete rules[fieldName];
      } else {
        rules[fieldName] = sanitized;
      }
      if (Object.keys(rules).length === 0) delete nextModels[modelName];
      else nextModels[modelName] = rules;
      return { ...prev, models: nextModels };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/seed/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save");
      onSaved(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const overlay = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <${Card} className="p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-background shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <${Settings2} className="w-4 h-4 shrink-0" />
            <h2 className="text-sm font-bold truncate">
              Generation rules — <span className="font-mono text-primary-foreground">{modelName}</span>
            </h2>
          </div>
          <${Button} variant="ghost" size="icon-sm" onClick={onClose}>
            <${X} className="w-4 h-4" />
          </${Button}>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Optional field null chance (global)
            </label>
            <div className="flex items-center gap-2">
              <${Input}
                type="number"
                min={0}
                max={100}
                value={Math.round((draft.optionalNullChance ?? 0.3) * 100)}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    optionalNullChance: Math.min(1, Math.max(0, Number(e.target.value) / 100)),
                  }))
                }
                className="h-8 text-xs w-20"
              />
              <span className="text-xs text-muted-foreground">% skip optional fields</span>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground">
            Override how each field on <strong>{modelName}</strong> is filled when seeding. Relation FKs still auto-link
            to existing records. Unconfigured fields use built-in name/type heuristics.
          </p>

          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {seedableFields.map((field) => {
              const enumDef = schema.enums.find((e) => e.name === field.type);
              return (
                <RuleEditor
                  key={field.name}
                  field={field}
                  schema={schema}
                  enumValues={enumDef?.values}
                  rule={
                    ${isValidFieldRule}(field, schema, modelRules[field.name])
                      ? modelRules[field.name]
                      : undefined
                  }
                  onChange={(rule) => setFieldRule(field.name, rule)}
                />
              );
            })}
            {seedableFields.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">No seedable scalar fields on this model.</p>
            )}
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-2 pt-2">
            <${Button} onClick={handleSave} disabled={saving} className="flex-1">
              Save rules
            </${Button}>
            <${Button} variant="ghost" onClick={onClose}>
              Cancel
            </${Button}>
          </div>
        </div>
      </${Card}>
    </div>
  );

  if (!mounted) return null;
  return ${createPortal}(overlay, document.body);
}

export function SeederModelConfigButton({
  modelName,
  schema,
  config,
  onConfigChange,
}: {
  modelName: string;
  schema: Schema.SchemaData | null;
  config: Seeder.ConfigFile | null;
  onConfigChange: (config: Seeder.ConfigFile) => void;
}) {
  const [open, setOpen] = ${useState}(false);
  if (!schema || !config) return null;

  const ruleCount = Object.keys(config.models[modelName] ?? {}).length;

  return (
    <>
      <${Button}
        variant="ghost"
        size="icon-sm"
        onClick={() => setOpen(true)}
        title="Generation rules"
        className="h-8 w-8 shrink-0"
      >
        <${Settings2} className={${cn}("w-3.5 h-3.5", ruleCount > 0 && "text-primary-foreground")} />
      </${Button}>
      {open && (
        <SeederConfigPanel
          schema={schema}
          config={config}
          modelName={modelName}
          onClose={() => setOpen(false)}
          onSaved={(next) => {
            onConfigChange(next);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}
`.toString({ prefix: '"use client";' });

export default writeSeederConfigPanelComponent;
