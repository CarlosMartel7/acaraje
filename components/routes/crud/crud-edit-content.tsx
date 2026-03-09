"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DynamicForm } from "@/components/dynamic-form";

export function CrudEditContent() {
  const params = useParams();
  const router = useRouter();
  const model = params.model as string;
  const id = params.id as string;

  const [schemaData, setSchemaData] = useState<any>(null);
  const [record, setRecord] = useState<any>(null);
  const [loadingRecord, setLoadingRecord] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/schemas").then((r) => r.json()),
      fetch(`/api/crud/${model}/${id}`).then((r) => r.json()),
    ]).then(([schema, rec]) => {
      setSchemaData(schema);
      setRecord(rec);
    }).finally(() => setLoadingRecord(false));
  }, [model, id]);

  const modelDef = schemaData?.models?.find(
    (m: any) => m.name.toLowerCase() === model.toLowerCase()
  );

  const handleSubmit = async (data: Record<string, any>) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/crud/${model}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update");
      setSuccess(true);
      setRecord(json);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 space-y-6 animate-in max-w-4xl">
      <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
        <Link href={`/crud/${model}`} className="flex items-center gap-1 hover:text-primary-foreground transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" />
          {model}
        </Link>
        <span>/</span>
        <span className="text-muted-foreground/60 truncate max-w-xs">{id}</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Edit <span className="text-primary-foreground">{model}</span>
        </h1>
        <p className="text-muted-foreground text-sm font-mono mt-1 truncate">{id}</p>
      </div>

      {success && (
        <div className="flex items-center gap-3 px-4 py-3 rounded border border-emerald-500/30 bg-emerald-500/5 text-emerald-400 text-sm">
          <CheckCircle className="w-4 h-4" />
          Saved successfully
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded border border-destructive/30 bg-destructive/5 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="font-mono text-xs">{error}</span>
        </div>
      )}

      {loadingRecord ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : record?.error ? (
        <div className="text-center py-12 text-muted-foreground">Record not found</div>
      ) : modelDef ? (
        <Card className="p-6">
          <DynamicForm
            modelName={model}
            fields={modelDef.fields}
            enums={schemaData?.enums || []}
            initialData={record}
            onSubmit={handleSubmit}
            onCancel={() => router.push(`/crud/${model}`)}
            isLoading={saving}
          />
        </Card>
      ) : null}
    </div>
  );
}
