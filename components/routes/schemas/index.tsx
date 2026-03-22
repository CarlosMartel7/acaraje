"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SchemaModelsTab } from "./models";
import { SchemaEnumsTab } from "./enums";
import { SchemaModelViewer } from "./viewer";
import AcarajeCalls_schemas from "./[[api-calls]]";

export function SchemasContent() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"models" | "enums">("models");
  const router = useRouter();

  const searchParams = useSearchParams();
  const selectedModelName = searchParams.get("model");
  const tabParam = searchParams.get("tab");

  const { data, filteredModels, filteredEnums, selectedModel, handleSelectModel } = AcarajeCalls_schemas({
    search,
    setActiveTab,
    tabParam: tabParam ?? "models",
    selectedModelName: selectedModelName ?? "",
    router,
  });

  console.log(data);

  return (
    <div className="flex h-full animate-in">
      <div className="w-72 flex-shrink-0 border-r border-border/50 flex flex-col min-h-0">
        <div className="p-4 border-b border-border/50 shrink-0">
          <h1 className="text-sm font-bold mb-3">Schema Explorer</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={activeTab === "models" ? "Search models..." : "Search enums..."}
              className="pl-9 text-xs font-mono h-8"
            />
          </div>
        </div>
        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            const tab = v as "models" | "enums";
            setActiveTab(tab);
            const q = new URLSearchParams();
            q.set("tab", tab);
            if (tab === "models" && selectedModelName) q.set("model", selectedModelName);
            router.replace(`/schemas?${q.toString()}`);
          }}
          className="flex-1 flex flex-col min-h-0"
        >
          <div className="px-4 pt-3 pb-2 shrink-0">
            <TabsList className="w-full">
              <TabsTrigger value="models" className="flex-1">
                Models ({data?.models.length ?? "—"})
              </TabsTrigger>
              <TabsTrigger value="enums" className="flex-1">
                Enums ({data?.enums.length ?? "—"})
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="models" className="flex-1 overflow-y-auto p-3 space-y-2 mt-0 min-h-0">
            <SchemaModelsTab models={filteredModels} selectedModelName={selectedModelName} onSelectModel={handleSelectModel} />
          </TabsContent>
          <TabsContent value="enums" className="flex-1 overflow-y-auto p-3 space-y-2 mt-0 min-h-0">
            <SchemaEnumsTab enums={filteredEnums} />
          </TabsContent>
        </Tabs>
      </div>

      <SchemaModelViewer
        model={selectedModel}
        modelsCount={data?.models.length ?? 0}
        enumNames={new Set(data?.enums.map((e) => e.name) ?? [])}
      />
    </div>
  );
}
