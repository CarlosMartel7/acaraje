"use client";

import { useCallback, useEffect, useState } from "react";

export interface ModelInfo {
  name: string;
  fieldCount: number;
}

export interface SeedResult {
  created: number;
  errors: string[];
}

export interface ModelState {
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

export default function AcarajeCalls_seeder() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [states, setStates] = useState<Record<string, ModelState>>({});
  const [seedingAll, setSeedingAll] = useState(false);

  useEffect(() => {
    Promise.all([fetch("/api/acaraje/schemas").then((r) => r.json()), fetch("/api/acaraje/seed").then((r) => r.json())]).then(([schema, seedData]) => {
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

  const updateState = useCallback((model: string, patch: Partial<ModelState>) => {
    setStates((prev) => ({ ...prev, [model]: { ...prev[model], ...patch } }));
  }, []);

  const seedModel = useCallback(
    async (modelName: string) => {
      const count = states[modelName]?.count || 5;
      updateState(modelName, { loading: true, result: null, error: null });
      try {
        const res = await fetch("/api/acaraje/seed", {
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
    },
    [states, updateState],
  );

  const seedAll = useCallback(async () => {
    setSeedingAll(true);
    try {
      for (const model of models) {
        await seedModel(model.name);
      }
    } finally {
      setSeedingAll(false);
    }
  }, [models, seedModel]);

  return {
    models,
    counts,
    states,
    seedingAll,
    updateState,
    seedModel,
    seedAll,
  };
}
