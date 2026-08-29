import { code, imp } from "ts-poet";

const useCallback = imp("useCallback@react")
const useEffect = imp("useEffect@react")
const useMemo = imp("useMemo@react")
const useState = imp("useState@react")
const useQueryClient = imp("useQueryClient@@tanstack/react-query")
const useSchemas = imp("useSchemas@@/query/hooks/use-schemas")
const useSeedCounts = imp("useSeedCounts@@/query/hooks/use-seed")
const useSeederConfig = imp("useSeederConfig@@/query/hooks/use-seed")
const useSeedModel = imp("useSeedModel@@/query/hooks/use-seed")
const queryKeys = imp("queryKeys@@/lib/query/keys")

export const writeSeederApiCallsComponent = () => code`
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
  const queryClient = ${useQueryClient}();
  const { data: schema, isLoading: schemaLoading } = ${useSchemas}();
  const { data: seedData, isLoading: countsLoading } = ${useSeedCounts}();
  const { data: seederConfig, isLoading: configLoading } = ${useSeederConfig}();
  const seedMutation = ${useSeedModel}();

  const [counts, setCounts] = ${useState}<Record<string, number>>({});
  const [states, setStates] = ${useState}<Record<string, ModelState>>({});
  const [seedingAll, setSeedingAll] = ${useState}(false);

  const models: ModelInfo[] = ${useMemo}(() => {
    const ms: ModelInfo[] = (schema?.models || []).map((m) => ({ name: m.name, fieldCount: m.fields.length }));
    ms.sort((a, b) => {
      const ai = SEED_ORDER.indexOf(a.name);
      const bi = SEED_ORDER.indexOf(b.name);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    return ms;
  }, [schema]);

  ${useEffect}(() => {
    if (!seedData) return;
    setCounts(seedData.counts || {});
  }, [seedData]);

  ${useEffect}(() => {
    if (models.length === 0) return;
    setStates((prev) => {
      const next = { ...prev };
      for (const m of models) {
        if (!next[m.name]) next[m.name] = { count: 5, loading: false, result: null, error: null, expanded: false };
      }
      return next;
    });
  }, [models]);

  const updateState = ${useCallback}((model: string, patch: Partial<ModelState>) => {
    setStates((prev) => ({ ...prev, [model]: { ...prev[model], ...patch } }));
  }, []);

  const setSeederConfig = ${useCallback}(
    (config: Seeder.ConfigFile) => {
      queryClient.setQueryData(${queryKeys}.seed.config, config);
    },
    [queryClient],
  );

  const seedModel = ${useCallback}(
    async (modelName: string) => {
      const count = states[modelName]?.count || 5;
      updateState(modelName, { loading: true, result: null, error: null });
      try {
        const json = await seedMutation.mutateAsync({ modelName, count });
        updateState(modelName, { result: json, loading: false });
        setCounts((prev) => ({ ...prev, [modelName]: (prev[modelName] || 0) + json.created }));
      } catch (err: any) {
        updateState(modelName, { error: err.message, loading: false });
      }
    },
    [states, updateState, seedMutation],
  );

  const seedAll = ${useCallback}(async () => {
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
    schema: schema ?? null,
    seederConfig: seederConfig ?? null,
    setSeederConfig,
    counts,
    states,
    seedingAll,
    loading: schemaLoading || countsLoading || configLoading,
    updateState,
    seedModel,
    seedAll,
  };
}
`.toString({ prefix: '"use client";' });

export default writeSeederApiCallsComponent;
