import { code, imp } from "ts-poet";

const useMemo = imp("useMemo@react")
const useState = imp("useState@react")
const useParams = imp("useParams@next/navigation")
const useRouter = imp("useRouter@next/navigation")
const useSchemas = imp("useSchemas@@/query/hooks/use-schemas")
const useCrudRecord = imp("useCrudRecord@@/query/hooks/use-crud")
const useCrudUpdate = imp("useCrudUpdate@@/query/hooks/use-crud")

export const writeCrudEditApiCalls = () => code`
export default function AcarajeCalls_crud_edit() {
  const params = ${useParams}();
  const router = ${useRouter}();
  const model = params.model as string;
  const id = params.id as string;

  const { data: schemaData } = ${useSchemas}();
  const { data: record, isError: recordIsError, error: recordError } = ${useCrudRecord}(model, id);
  const updateMutation = ${useCrudUpdate}(model, id);
  const [transientSuccess, setTransientSuccess] = ${useState}(false);

  const modelDef = ${useMemo}(
    () => schemaData?.models?.find((m) => m.name.toLowerCase() === model.toLowerCase()) ?? null,
    [schemaData, model],
  );

  const handleSubmit = async (data: Record<string, any>) => {
    await updateMutation.mutateAsync(data, {
      onSuccess: () => {
        setTransientSuccess(true);
        setTimeout(() => setTransientSuccess(false), 3000);
      },
    });
  };

  return {
    model,
    id,
    router,
    schemaData: schemaData ?? null,
    record: record ?? (recordIsError ? { error: (recordError as Error)?.message ?? "Record not found" } : null),
    modelDef,
    saving: updateMutation.isPending,
    success: transientSuccess,
    error: updateMutation.error ? (updateMutation.error as Error).message : null,
    handleSubmit,
  };
}
`.toString({ prefix: '"use client";' });

export default writeCrudEditApiCalls;
