"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface AcarajeCalls_schemasProps {
  search: string;
  setActiveTab: (activeTab: "models" | "enums") => void;
  tabParam: string;
  selectedModelName: string;
  router: ReturnType<typeof useRouter>;
}

export default function AcarajeCalls_schemas({ search, setActiveTab, tabParam, selectedModelName, router }: AcarajeCalls_schemasProps) {
  const [data, setData] = useState<Schema.SchemaData | null>(null);

  useEffect(() => {
    fetch("/api/acaraje/schemas")
      .then((r) => r.json())
      .then(setData);
  }, []);

  useEffect(() => {
    if (tabParam === "enums" || tabParam === "enum") setActiveTab("enums");
    else if (tabParam === "models") setActiveTab("models");
  }, [tabParam]);

  const filteredModels = data?.models.filter((m) => m.name.toLowerCase().includes(search.toLowerCase())) || [];

  const filteredEnums = data?.enums.filter((e) => e.name.toLowerCase().includes(search.toLowerCase())) || [];

  const selectedModel = data?.models.find((m) => m.name === selectedModelName) ?? null;

  const handleSelectModel = (modelName: string) => {
    const params = new URLSearchParams();
    params.set("tab", "models");
    if (selectedModelName !== modelName) params.set("model", modelName);
    router.push(`/schemas?${params.toString()}`);
  };

  return { data, filteredModels, filteredEnums, selectedModel, handleSelectModel, router };
}
