"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function AcarajeCalls_crud_edit() {
  const params = useParams();
  const router = useRouter();
  const model = params.model as string;
  const id = params.id as string;

  const [schemaData, setSchemaData] = useState<Schema.SchemaData | null>(null);
  const [record, setRecord] = useState<Record<string, any> | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/acaraje/schemas").then((r) => r.json()),
      fetch(`/api/acaraje/crud/${model}/${id}`).then((r) => r.json()),
    ]).then(([schema, rec]) => {
      setSchemaData(schema);
      setRecord(rec);
    });
  }, [model, id]);

  const modelDef = useMemo(
    () =>
      schemaData?.models?.find((m) => m.name.toLowerCase() === model.toLowerCase()) ?? null,
    [schemaData, model],
  );

  const handleSubmit = async (data: Record<string, any>) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/acaraje/crud/${model}/${id}`, {
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

  return {
    model,
    id,
    router,
    schemaData,
    record,
    modelDef,
    saving,
    success,
    error,
    handleSubmit,
  };
}
