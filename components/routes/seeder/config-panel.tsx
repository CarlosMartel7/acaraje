"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  allowedGeneratorKinds,
  emptyRuleForKind,
  fakerPresetsForField,
  generatorKindOptions,
  isSeedableField,
  isValidFieldRule,
  sanitizeFieldRule,
} from "@/lib/seeder/field-generators";

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
  const kinds = generatorKindOptions(field, schema);
  const allowed = new Set(allowedGeneratorKinds(field, schema));
  const rawKind = rule?.kind ?? "default";
  const kind = allowed.has(rawKind) ? rawKind : "default";
  const fakerPresets = fakerPresetsForField(field, schema);

  return (
    <div className="space-y-2 rounded border border-border/40 p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="text-xs font-mono font-medium">{field.name}</span>
          <span className="text-[10px] text-muted-foreground ml-2">{field.type}</span>
        </div>
        <Select
          value={kind}
          onValueChange={(v) => {
            if (v === "default") onChange(undefined);
            else onChange(emptyRuleForKind(v as Seeder.GeneratorKind, field, schema));
          }}
        >
          <SelectTrigger className="h-7 w-[9.5rem] text-[10px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {kinds.map((g) => (
              <SelectItem key={g.value} value={g.value}>
                {g.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {rule?.kind === "faker" && fakerPresets.length > 0 && (
        <Select value={rule.path} onValueChange={(path) => onChange({ kind: "faker", path })}>
          <SelectTrigger className="h-7 text-[10px]">
            <SelectValue placeholder="Faker path..." />
          </SelectTrigger>
          <SelectContent>
            {fakerPresets.map((p) => (
              <SelectItem key={p.path} value={p.path}>
                {p.label} ({p.path})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {rule?.kind === "int" && (
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            value={rule.min ?? 0}
            onChange={(e) => onChange({ ...rule, min: Number(e.target.value) })}
            placeholder="Min"
            className="h-7 text-[10px]"
          />
          <Input
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
          <Input
            type="number"
            value={rule.min ?? 0}
            onChange={(e) => onChange({ ...rule, min: Number(e.target.value) })}
            placeholder="Min"
            className="h-7 text-[10px]"
          />
          <Input
            type="number"
            value={rule.max ?? 100}
            onChange={(e) => onChange({ ...rule, max: Number(e.target.value) })}
            placeholder="Max"
            className="h-7 text-[10px]"
          />
          <Input
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
          <Select
            value={rule.value === undefined ? "random" : rule.value ? "true" : "false"}
            onValueChange={(v) => {
              if (v === "random") onChange({ kind: "boolean", trueChance: rule.trueChance ?? 0.5 });
              else onChange({ kind: "boolean", value: v === "true" });
            }}
          >
            <SelectTrigger className="h-7 text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="random">Random</SelectItem>
              <SelectItem value="true">Always true</SelectItem>
              <SelectItem value="false">Always false</SelectItem>
            </SelectContent>
          </Select>
          {rule.value === undefined && (
            <Input
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
        <Input
          value={(rule.values ?? []).join(", ")}
          onChange={(e) => {
            const values = e.target.value
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean);
            onChange({ kind: "enum", values: values.length ? values : undefined });
          }}
          placeholder={`All values, or subset: ${enumValues.join(", ")}`}
          className="h-7 text-[10px] font-mono"
        />
      )}

      {rule?.kind === "fixed" && field.type === "Boolean" && (
        <Select
          value={rule.value === true ? "true" : rule.value === false ? "false" : "true"}
          onValueChange={(v) => onChange({ kind: "fixed", value: v === "true" })}
        >
          <SelectTrigger className="h-7 text-[10px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">true</SelectItem>
            <SelectItem value="false">false</SelectItem>
          </SelectContent>
        </Select>
      )}

      {rule?.kind === "fixed" && field.type !== "Boolean" && (
        <Input
          value={String(rule.value ?? "")}
          onChange={(e) => onChange({ kind: "fixed", value: e.target.value })}
          placeholder={
            field.type === "Json"
              ? '{"key": "value"}'
              : field.type === "Int" || field.type === "BigInt"
                ? "42"
                : field.type === "Float" || field.type === "Decimal"
                  ? "3.14"
                  : "Literal value"
          }
          className="h-7 text-[10px] font-mono"
        />
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
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState<Seeder.ConfigFile>(config);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  const model = useMemo(
    () => schema.models.find((m) => m.name === modelName) ?? null,
    [schema.models, modelName],
  );

  const seedableFields = useMemo(
    () => model?.fields.filter(isSeedableField) ?? [],
    [model],
  );

  const modelRules = draft.models[modelName] ?? {};

  const setFieldRule = (fieldName: string, rule: Seeder.FieldGenerator | undefined) => {
    const field = model?.fields.find((f) => f.name === fieldName);
    if (!field) return;
    const sanitized = sanitizeFieldRule(field, schema, rule);
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
      const res = await fetch("/api/acaraje/seed/config", {
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
      <Card className="p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-background shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <Settings2 className="w-4 h-4 shrink-0" />
            <h2 className="text-sm font-bold truncate">
              Generation rules — <span className="font-mono text-primary-foreground">{modelName}</span>
            </h2>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Optional field null chance (global)
            </label>
            <div className="flex items-center gap-2">
              <Input
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
                    isValidFieldRule(field, schema, modelRules[field.name])
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
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              Save rules
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );

  if (!mounted) return null;
  return createPortal(overlay, document.body);
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
  const [open, setOpen] = useState(false);
  if (!schema || !config) return null;

  const ruleCount = Object.keys(config.models[modelName] ?? {}).length;

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setOpen(true)}
        title="Generation rules"
        className="h-8 w-8 shrink-0"
      >
        <Settings2 className={cn("w-3.5 h-3.5", ruleCount > 0 && "text-primary-foreground")} />
      </Button>
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
