import { code, imp } from "ts-poet";

const useMemo = imp("useMemo@react")
const useParams = imp("useParams@next/navigation")
const useRouter = imp("useRouter@next/navigation")
const acarajePath = imp("acarajePath@@/lib/acaraje-routes")
const useSchemas = imp("useSchemas@@/query/hooks/use-schemas")
const useCrudCreate = imp("useCrudCreate@@/query/hooks/use-crud")

export const writeCrudNewApiCalls = () => code`
export default function AcarajeCalls_crud_new() {
  const params = ${useParams}();
  const router = ${useRouter}();
  const model = params.model as string;

  const { data: schemaData } = ${useSchemas}();
  const createMutation = ${useCrudCreate}(model);

  const modelDef = ${useMemo}(
    () => schemaData?.models?.find((m) => m.name.toLowerCase() === model.toLowerCase()) ?? null,
    [schemaData, model],
  );

  const handleSubmit = async (data: Record<string, any>) => {
    try {
      await createMutation.mutateAsync(data);
      setTimeout(() => router.push(${acarajePath}(\`/crud/\${model}\`)), 1200);
    } catch {
      // surfaced via createMutation.error below
    }
  };

  return {
    model,
    router,
    schemaData: schemaData ?? null,
    modelDef,
    loading: createMutation.isPending,
    success: createMutation.isSuccess,
    error: createMutation.error ? (createMutation.error as Error).message : null,
    handleSubmit,
  };
}
`.toString({ prefix: '"use client";' });

export default writeCrudNewApiCalls;
