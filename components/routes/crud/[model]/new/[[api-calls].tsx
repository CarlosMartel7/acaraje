"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function AcarajeCalls_crud_new() {
  const params = useParams();
  const router = useRouter();
  const model = params.model as string;

  const [schemaData, setSchemaData] = useState<Schema.SchemaData | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/acaraje/schemas")
      .then((r) => r.json())
      .then(setSchemaData);
  }, []);

  const modelDef = useMemo(
    () =>
      schemaData?.models?.find((m) => m.name.toLowerCase() === model.toLowerCase()) ?? null,
    [schemaData, model],
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

  return {
    model,
    router,
    schemaData,
    modelDef,
    loading,
    success,
    error,
    handleSubmit,
  };
}
