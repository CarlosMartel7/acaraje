"use client";

import Link from "next/link";
import { ChevronLeft, CheckCircle, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DynamicForm } from "@/components/routes/crud/dynamic-form";
import AcarajeCalls_crud_edit from "./[[api-calls]";

export function CrudEditContent() {
  const { model, id, router, schemaData, record, modelDef, saving, success, error, handleSubmit } =
    AcarajeCalls_crud_edit();

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

      {record?.error ? (
        <div className="text-center py-12 text-muted-foreground">Record not found</div>
      ) : modelDef && record != null ? (
        <Card className="p-6">
          <DynamicForm
            modelName={model}
            fields={modelDef.fields}
            enums={schemaData?.enums ?? []}
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
