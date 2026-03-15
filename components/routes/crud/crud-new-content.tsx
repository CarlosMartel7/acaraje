"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, CheckCircle, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DynamicForm } from "@/components/dynamic-form";

export function CrudNewContent() {
  const params = useParams();
  const router = useRouter();
  const model = params.model as string;

  const [schemaData, setSchemaData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/acaraje/schemas").then((r) => r.json()).then(setSchemaData);
  }, []);

  const modelDef = schemaData?.models?.find(
    (m: any) => m.name.toLowerCase() === model.toLowerCase()
  );

  const handleSubmit = async (data: Record<string, any>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/acaraje/crud/${model}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create");
      setSuccess(true);
      setTimeout(() => router.push(`/crud/${model}`), 1200);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
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
        <span className="text-primary-foreground">new</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          New <span className="text-primary-foreground">{model}</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Fill in the fields below to create a new record</p>
      </div>

      {success && (
        <div className="flex items-center gap-3 px-4 py-3 rounded border border-emerald-500/30 bg-emerald-500/5 text-emerald-400 text-sm">
          <CheckCircle className="w-4 h-4" />
          Record created! Redirecting…
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded border border-destructive/30 bg-destructive/5 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="font-mono text-xs">{error}</span>
        </div>
      )}

      {modelDef ? (
        <Card className="p-6">
          <DynamicForm
            modelName={model}
            fields={modelDef.fields}
            enums={schemaData?.enums || []}
            onSubmit={handleSubmit}
            onCancel={() => router.push(`/crud/${model}`)}
            isLoading={loading}
          />
        </Card>
      ) : (
        <Card className="h-48 animate-pulse bg-card/40" />
      )}
    </div>
  );
}
