"use client";

import { useEffect, useState } from "react";
import { Sprout, Loader2, CheckCircle, AlertCircle, Database, ChevronDown, ChevronUp, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

interface ModelInfo {
  name: string;
  fieldCount: number;
}

interface SeedResult {
  created: number;
  errors: string[];
}

interface ModelState {
  count: number;
  loading: boolean;
  result: SeedResult | null;
  error: string | null;
  expanded: boolean;
}

const SEED_ORDER = [
  "User",
  "Seller",
  "Category",
  "Tag",
  "Product",
  "ProductVariant",
  "ProductImage",
  "ProductTag",
  "Cart",
  "CartItem",
  "Wishlist",
  "WishlistItem",
  "Coupon",
  "Address",
  "Order",
  "OrderItem",
  "Payment",
  "Shipment",
  "Review",
  "CouponUse",
];

export function SeederContent() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [states, setStates] = useState<Record<string, ModelState>>({});
  const [seedingAll, setSeedingAll] = useState(false);

  useEffect(() => {
    Promise.all([fetch("/api/schemas").then((r) => r.json()), fetch("/api/seed").then((r) => r.json())]).then(([schema, seedData]) => {
      const ms: ModelInfo[] = (schema.models || []).map((m: any) => ({
        name: m.name,
        fieldCount: m.fields.length,
      }));
      ms.sort((a, b) => {
        const ai = SEED_ORDER.indexOf(a.name);
        const bi = SEED_ORDER.indexOf(b.name);
        if (ai === -1 && bi === -1) return 0;
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });
      setModels(ms);
      setCounts(seedData.counts || {});
      const init: Record<string, ModelState> = {};
      for (const m of ms) {
        init[m.name] = { count: 5, loading: false, result: null, error: null, expanded: false };
      }
      setStates(init);
    });
  }, []);

  const updateState = (model: string, patch: Partial<ModelState>) =>
    setStates((prev) => ({ ...prev, [model]: { ...prev[model], ...patch } }));

  const seedModel = async (modelName: string) => {
    const count = states[modelName]?.count || 5;
    updateState(modelName, { loading: true, result: null, error: null });
    try {
      const res = await fetch("/api/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelName, count }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      updateState(modelName, { result: json, loading: false });
      setCounts((prev) => ({ ...prev, [modelName]: (prev[modelName] || 0) + json.created }));
    } catch (err: any) {
      updateState(modelName, { error: err.message, loading: false });
    }
  };

  const seedAll = async () => {
    setSeedingAll(true);
    for (const model of models) {
      await seedModel(model.name);
    }
    setSeedingAll(false);
  };

  const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="p-8 space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Database Seeder</h1>
          <p className="text-muted-foreground text-sm mt-1">Generate realistic fake data for each model</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-2xl font-bold font-mono text-primary-foreground">{totalRecords.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">total records</div>
          </div>
          <Button
            variant="outline"
            onClick={seedAll}
            disabled={seedingAll}
            className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
          >
            {seedingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sprout className="w-4 h-4" />}
            Seed All Models
          </Button>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 px-4 py-3 rounded border border-amber-500/20 bg-amber-500/5 text-amber-400/80 text-xs">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>
          Models are ordered by dependency — seed <strong>User</strong> and <strong>Category</strong> before models that reference them.
          Relational fields will auto-connect to existing records.
        </span>
      </div>

      {/* Model cards grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {models.map((model, idx) => {
          const state = states[model.name];
          if (!state) return null;
          const recordCount = counts[model.name] || 0;

          return (
            <Card
              key={model.name}
              className={cn(
                "overflow-hidden transition-all",
                state.result && state.result.errors.length === 0
                  ? "border-emerald-500/30"
                  : state.error
                    ? "border-destructive/30"
                    : "border-border/50",
              )}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-secondary/80 border border-border/50 flex items-center justify-center text-[10px] font-mono text-muted-foreground">
                  {idx + 1}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold font-mono">{model.name}</span>
                    <span className="text-[10px] font-mono text-muted-foreground/60">{model.fieldCount} fields</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Database className="w-3 h-3 text-muted-foreground/40" />
                    <span className="text-xs font-mono text-muted-foreground">{recordCount.toLocaleString()} records</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => updateState(model.name, { count: Math.max(1, state.count - 1) })}
                    className="h-6 w-6"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={state.count}
                    onChange={(e) => updateState(model.name, { count: parseInt(e.target.value) || 1 })}
                    className="w-12 text-center text-xs font-mono h-8 py-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => updateState(model.name, { count: Math.min(100, state.count + 1) })}
                    className="h-6 w-6"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </Button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => seedModel(model.name)}
                  disabled={state.loading}
                  className="bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/20"
                >
                  {state.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                  Seed
                </Button>
              </div>

              {state.result && (
                <div
                  className={cn(
                    "px-4 py-2 border-t text-xs font-mono flex items-center gap-2",
                    state.result.errors.length > 0
                      ? "border-amber-500/20 bg-amber-500/5 text-amber-400"
                      : "border-emerald-500/20 bg-emerald-500/5 text-emerald-400",
                  )}
                >
                  <CheckCircle className="w-3 h-3 flex-shrink-0" />
                  <span>Created {state.result.created} records</span>
                  {state.result.errors.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateState(model.name, { expanded: !state.expanded })}
                      className="ml-auto h-auto py-0 text-amber-400/70 hover:text-amber-400"
                    >
                      {state.result.errors.length} errors ▾
                    </Button>
                  )}
                </div>
              )}

              {state.expanded && state.result && state.result.errors.length > 0 && (
                <div className="px-4 pb-3 space-y-1">
                  {state.result.errors.map((e, i) => (
                    <p key={i} className="text-[10px] font-mono text-red-400/80 bg-red-400/5 rounded px-2 py-1">
                      {e}
                    </p>
                  ))}
                </div>
              )}

              {state.error && (
                <div className="px-4 py-2 border-t border-destructive/20 bg-destructive/5 text-xs font-mono text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  {state.error}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
