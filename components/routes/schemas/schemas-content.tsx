"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, ChevronRight, Tag, Layers, Hash, Key, Link2 } from "lucide-react";
import { cn, getFieldTypeColor } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";

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
  attributes: string[];
}

interface Model {
  name: string;
  fields: Field[];
  mapName?: string;
  indexes: string[];
}

interface EnumType {
  name: string;
  values: string[];
}

interface SchemaData {
  models: Model[];
  enums: EnumType[];
  datasource: { provider: string; url: string } | null;
  generator: { provider: string } | null;
}

function FieldBadge({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border",
        color || "text-muted-foreground border-border/50 bg-secondary/30",
      )}
    >
      {children}
    </span>
  );
}

function ModelCard({ model, isSelected, onClick }: { model: Model; isSelected: boolean; onClick: () => void }) {
  const relationCount = model.fields.filter((f) => f.isRelation).length;
  const idField = model.fields.find((f) => f.isId);

  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className={cn(
        "w-full justify-start h-auto rounded-lg border p-4 transition-all duration-150 group",
        isSelected ? "border-primary-foreground/40 bg-primary glow-primary-foreground-sm" : "border-border/50 bg-card/40 hover:border-border hover:bg-card/60",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("text-sm font-bold font-mono truncate", isSelected ? "text-primary-foreground" : "text-foreground")}>{model.name}</span>
            {model.mapName && <span className="text-[10px] font-mono text-muted-foreground/60">@{model.mapName}</span>}
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-[11px] font-mono text-muted-foreground">{model.fields.length} fields</span>
            {relationCount > 0 && <span className="text-[11px] font-mono text-muted-foreground">{relationCount} relations</span>}
            {idField && <span className="text-[11px] font-mono text-muted-foreground/50">id: {idField.type}</span>}
          </div>
        </div>
        <ChevronRight
          className={cn(
            "w-4 h-4 flex-shrink-0 mt-0.5 transition-all",
            isSelected ? "text-primary-foreground rotate-90" : "text-muted-foreground/30 group-hover:text-muted-foreground",
          )}
        />
      </div>
    </Button>
  );
}

function FieldRow({ field }: { field: Field }) {
  return (
    <div className="flex items-start gap-3 py-2.5 px-4 border-b border-border/30 hover:bg-accent/20 transition-colors group">
      <div className="w-5 flex-shrink-0 flex items-center justify-center pt-0.5">
        {field.isId ? (
          <Key className="w-3 h-3 text-chart-1" />
        ) : field.isRelation ? (
          <Link2 className="w-3 h-3 text-chart-5" />
        ) : (
          <Hash className="w-3 h-3 text-muted-foreground/30" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-mono text-foreground">{field.name}</span>
          <span className={cn("text-sm font-mono font-medium", getFieldTypeColor(field.type))}>
            {field.type}
            {field.isList && "[]"}
            {!field.isRequired && "?"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {field.isId && <FieldBadge color="text-chart-1 border-chart-1/30 bg-chart-1/5">@id</FieldBadge>}
          {field.isUnique && <FieldBadge color="text-chart-5 border-chart-5/30 bg-chart-5/5">@unique</FieldBadge>}
          {field.hasDefault && (
            <FieldBadge color="text-chart-4 border-chart-4/30 bg-chart-4/5">@default({field.defaultValue})</FieldBadge>
          )}
          {field.isRelation && <FieldBadge color="text-chart-5 border-chart-5/30 bg-chart-5/5">@relation</FieldBadge>}
        </div>
      </div>
    </div>
  );
}

export function SchemasContent() {
  const [data, setData] = useState<SchemaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"models" | "enums">("models");
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedModelName = searchParams.get("model");
  const tabParam = searchParams.get("tab");

  useEffect(() => {
    fetch("/api/acaraje/schemas")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tabParam === "enums" || tabParam === "enum") setActiveTab("enums");
    else if (tabParam === "models") setActiveTab("models");
  }, [tabParam]);

  const filteredModels = data?.models.filter((m) => m.name.toLowerCase().includes(search.toLowerCase())) || [];

  const filteredEnums = data?.enums.filter((e) => e.name.toLowerCase().includes(search.toLowerCase())) || [];

  const selectedModel = data?.models.find((m) => m.name === selectedModelName);

  return (
    <div className="flex h-full animate-in">
      {/* Left panel */}
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
            {loading
              ? [...Array(6)].map((_, i) => <Card key={i} className="h-16 animate-pulse bg-card/40" />)
              : filteredModels.map((model) => (
                  <ModelCard
                    key={model.name}
                    model={model}
                    isSelected={selectedModelName === model.name}
                    onClick={() => {
                      const params = new URLSearchParams();
                      params.set("tab", "models");
                      if (selectedModelName !== model.name) params.set("model", model.name);
                      router.push(`/schemas?${params.toString()}`);
                    }}
                  />
                ))}
          </TabsContent>
          <TabsContent value="enums" className="flex-1 overflow-y-auto p-3 space-y-2 mt-0 min-h-0">
            {loading
              ? [...Array(6)].map((_, i) => <Card key={i} className="h-16 animate-pulse bg-card/40" />)
              : filteredEnums.map((enumType) => (
                  <Card key={enumType.name} className="border-border/50 bg-card/40 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Layers className="w-3.5 h-3.5 text-chart-1" />
                      <span className="text-sm font-bold font-mono text-chart-1">{enumType.name}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {enumType.values.map((v) => (
                        <span
                          key={v}
                          className="px-2 py-0.5 rounded text-[11px] font-mono bg-secondary/50 border border-border/50 text-muted-foreground"
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                  </Card>
                ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* Detail panel */}
      <div className="flex-1 overflow-y-auto">
        {selectedModel ? (
          <div className="p-6">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl font-bold font-mono text-primary-foreground">{selectedModel.name}</h2>
                {selectedModel.mapName && (
                  <span className="px-2 py-0.5 rounded text-xs font-mono border border-border/50 text-muted-foreground">
                    @@map("{selectedModel.mapName}")
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
                <span>{selectedModel.fields.length} fields</span>
                <span>{selectedModel.fields.filter((f) => f.isRelation).length} relations</span>
                <span>{selectedModel.indexes.length} indexes</span>
              </div>
            </div>

            {/* Fields table */}
            <Card className="overflow-hidden border-border/50">
              <div className="px-4 py-2.5 border-b border-border/50 bg-secondary/30 flex items-center gap-2">
                <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider">Fields</span>
              </div>
              {selectedModel.fields.map((field) => (
                <FieldRow key={field.name} field={field} />
              ))}
            </Card>

            {/* Indexes */}
            {selectedModel.indexes.length > 0 && (
              <Card className="mt-4 overflow-hidden border-border/50">
                <div className="px-4 py-2.5 border-b border-border/50 bg-secondary/30 flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider">
                    Indexes & Constraints
                  </span>
                </div>
                {selectedModel.indexes.map((idx, i) => (
                  <div
                    key={i}
                    className="px-4 py-2.5 border-b border-border/30 last:border-0 font-mono text-xs text-muted-foreground hover:bg-accent/20 transition-colors"
                  >
                    {idx}
                  </div>
                ))}
              </Card>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
              <Tag className="w-7 h-7 text-muted-foreground/40" />
            </div>
            <p className="text-muted-foreground text-sm">Select a model to inspect its fields</p>
            <p className="text-muted-foreground/50 text-xs mt-1 font-mono">{data?.models.length} models available</p>
          </div>
        )}
      </div>
    </div>
  );
}
