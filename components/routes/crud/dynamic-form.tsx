"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

/** Radix Select requires non-empty string values; map empty selection to this sentinel. */
const SELECT_EMPTY = "__acaraje_empty__";

interface Field {
  name: string;
  type: string;
  isRequired: boolean;
  isList: boolean;
  isId: boolean;
  isUnique: boolean;
  hasDefault: boolean;
  defaultValue?: string;
  isRelation: boolean;
  relationFields?: string[];
  attributes: string[];
}

interface EnumType {
  name: string;
  values: string[];
}

interface DynamicFormProps {
  modelName: string;
  fields: Field[];
  enums: EnumType[];
  initialData?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

interface RelationOption {
  value: string;
  label: string;
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

export function DynamicForm({
  modelName,
  fields,
  enums,
  initialData,
  onSubmit,
  onCancel,
  isLoading,
}: DynamicFormProps) {
  const [values, setValues] = useState<Record<string, any>>({});
  const [relationOptions, setRelationOptions] = useState<Record<string, RelationOption[]>>({});

  // Determine which fields to show
  const editableFields = fields.filter((f) => {
    if (f.isList) return false; // skip array back-relations
    if (f.isId && f.hasDefault) return false; // skip auto-id
    if (["createdAt", "updatedAt"].includes(f.name)) return false; // skip timestamps
    // Skip back-reference relations (no FK)
    if (f.isRelation && (!f.relationFields || f.relationFields.length === 0)) return false;
    return true;
  });

  // Pre-fill with initial data
  useEffect(() => {
    if (initialData) {
      const filled: Record<string, any> = {};
      for (const f of editableFields) {
        if (initialData[f.name] !== undefined && initialData[f.name] !== null) {
          if (f.type === "DateTime") {
            // Format for datetime-local input
            const d = new Date(initialData[f.name]);
            filled[f.name] = d.toISOString().slice(0, 16);
          } else {
            filled[f.name] = initialData[f.name];
          }
        }
      }
      setValues(filled);
    }
  }, [initialData]);

  // Load relation options
  useEffect(() => {
    const relFields = editableFields.filter((f) => f.isRelation && f.type);
    for (const f of relFields) {
      fetch(`/api/acaraje/crud/${f.type}/options`)
        .then((r) => r.json())
        .then((d) => {
          setRelationOptions((prev) => ({ ...prev, [f.type]: d.options || [] }));
        });
    }
  }, []);

  const set = (name: string, value: any) =>
    setValues((prev) => ({ ...prev, [name]: value }));

  const handleSubmit = async () => {
    const data: Record<string, any> = {};
    for (const f of editableFields) {
      const val = values[f.name];
      if (val === undefined || val === "") {
        if (f.isRequired && !f.hasDefault) {
          // Leave for server to catch
        }
        continue;
      }
      // Type coercion
      if (f.type === "Int") data[f.name] = parseInt(val, 10);
      else if (f.type === "Float" || f.type === "Decimal") data[f.name] = parseFloat(val);
      else if (f.type === "Boolean") data[f.name] = val === true || val === "true";
      else if (f.type === "DateTime") data[f.name] = new Date(val).toISOString();
      else data[f.name] = val;
    }
    await onSubmit(data);
  };

  const renderField = (field: Field) => {
    const enumDef = enums.find((e) => e.name === field.type);
    const val = values[field.name] ?? "";

    // Relation field → dropdown
    if (field.isRelation) {
      const opts = relationOptions[field.type] || [];
      const fkField = field.relationFields?.[0];
      const fkVal = fkField ? (values[fkField] ?? "") : val;
      const selectValue = fkVal === "" || fkVal === undefined ? SELECT_EMPTY : String(fkVal);
      return (
        <div key={field.name}>
          <Label required={field.isRequired}>{field.name}</Label>
          <Select
            value={selectValue}
            onValueChange={(v) => {
              const next = v === SELECT_EMPTY ? "" : v;
              if (fkField) set(fkField, next);
              else set(field.name, next);
            }}
          >
            <SelectTrigger className={cn(inputClass, "w-full")}>
              <SelectValue placeholder={`— select ${field.type} —`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SELECT_EMPTY}>— select {field.type} —</SelectItem>
              {opts.map((o) => (
                <SelectItem key={o.value} value={String(o.value)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    // Enum → select
    if (enumDef) {
      const selectValue = val === "" || val === undefined ? SELECT_EMPTY : String(val);
      return (
        <div key={field.name}>
          <Label required={field.isRequired}>{field.name}</Label>
          <Select
            value={selectValue}
            onValueChange={(v) => set(field.name, v === SELECT_EMPTY ? "" : v)}
          >
            <SelectTrigger className={cn(inputClass, "w-full")}>
              <SelectValue placeholder="— select —" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SELECT_EMPTY}>— select —</SelectItem>
              {enumDef.values.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    // Boolean → toggle
    if (field.type === "Boolean") {
      return (
        <div key={field.name} className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => set(field.name, !(val === true || val === "true"))}
            className={cn(
              "relative w-9 h-5 rounded-full p-0 transition-colors border",
              val === true || val === "true"
                ? "bg-primary-foreground/20 border-primary-foreground/50"
                : "bg-secondary border-border/50"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 w-4 h-4 rounded-full transition-all",
                val === true || val === "true"
                  ? "left-4 bg-primary-foreground"
                  : "left-0.5 bg-muted-foreground/40"
              )}
            />
          </Button>
          <Label>{field.name}</Label>
        </div>
      );
    }

    // DateTime
    if (field.type === "DateTime") {
      return (
        <div key={field.name}>
          <Label required={field.isRequired}>{field.name}</Label>
          <Input
            type="datetime-local"
            value={val}
            onChange={(e) => set(field.name, e.target.value)}
            className={inputClass}
          />
        </div>
      );
    }

    // Int / Float / Decimal
    if (["Int", "Float", "Decimal"].includes(field.type)) {
      return (
        <div key={field.name}>
          <Label required={field.isRequired}>{field.name}</Label>
          <Input
            type="number"
            step={field.type === "Int" ? "1" : "0.01"}
            value={val}
            onChange={(e) => set(field.name, e.target.value)}
            placeholder={`0${field.type !== "Int" ? ".00" : ""}`}
            className={inputClass}
          />
        </div>
      );
    }

    // Json
    if (field.type === "Json") {
      return (
        <div key={field.name}>
          <Label required={field.isRequired}>{field.name} <span className="text-muted-foreground/50">(JSON)</span></Label>
          <textarea
            rows={3}
            value={typeof val === "object" ? JSON.stringify(val, null, 2) : val}
            onChange={(e) => set(field.name, e.target.value)}
            placeholder='{"key": "value"}'
            className={cn(inputClass, "resize-none font-mono text-xs")}
          />
        </div>
      );
    }

    // Long text fields
    const isTextarea = ["description", "body", "notes", "content", "bio"].some((k) =>
      field.name.toLowerCase().includes(k)
    );
    if (isTextarea) {
      return (
        <div key={field.name}>
          <Label required={field.isRequired}>{field.name}</Label>
          <textarea
            rows={3}
            value={val}
            onChange={(e) => set(field.name, e.target.value)}
            placeholder={`Enter ${field.name}...`}
            className={cn(inputClass, "resize-none")}
          />
        </div>
      );
    }

    // Default: text input
    const isPassword = field.name.toLowerCase().includes("password") || field.name.toLowerCase().includes("hash");
    return (
      <div key={field.name}>
        <Label required={field.isRequired}>{field.name}</Label>
        <Input
          type={isPassword ? "password" : "text"}
          value={val}
          onChange={(e) => set(field.name, e.target.value)}
          placeholder={`Enter ${field.name}...`}
          className={inputClass}
        />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {editableFields.map(renderField)}
      </div>
      <div className="flex items-center gap-3 pt-4 border-t border-border/50">
        <Button
          variant="outline"
          onClick={handleSubmit}
          disabled={isLoading}
          className="bg-primary-foreground/10 border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/20"
        >
          {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {initialData ? "Save Changes" : "Create Record"}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
