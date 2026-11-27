import { code, imp } from "ts-poet";

const z = imp("z@zod")
const TRPCError = imp("TRPCError@@trpc/server")
const router = imp("router@@/server/trpc/init")
const protectedProcedure = imp("protectedProcedure@@/server/trpc/init")
const CrudHandlers = imp("t:CrudHandlers@@/server/trpc/routers/crud/types")

// Import alias for a model's handlers — suffixed so a model/table named like a reserved word
// ("delete", "default", ...) still yields a valid identifier.
export const crudHandlersIdentifier = (modelName: string) => `${modelName}Handlers`

// Written to server/trpc/routers/crud/index.ts. One "crud" router for every model (mirroring how
// the REST flavor serves every model under /api/crud/<model>), dispatching on input.model to the
// per-model handlers in ./models/<Model>.ts. Mirrors templates/api/crud/[model]/** — keep in sync.
export const writeCrudRouter = (modelNames: string[]) => {
  const imports = modelNames
    .map((name) => `import { handlers as ${crudHandlersIdentifier(name)} } from "./models/${name}";`)
    .join("\n")
  const entries = modelNames
    .map((name) => `  ${JSON.stringify(name)}: ${crudHandlersIdentifier(name)},`)
    .join("\n")

  return code`
${imports}

const HANDLERS: Record<string, ${CrudHandlers}> = {
${entries}
};

function handlersFor(model: string): ${CrudHandlers} {
  const handlers = HANDLERS[model];
  if (!handlers) throw new ${TRPCError}({ code: "NOT_FOUND", message: \`Unknown model "\${model}"\` });
  return handlers;
}

const modelInput = ${z}.object({ model: ${z}.string() });

const filterCondition = ${z}.object({
  field: ${z}.string(),
  operator: ${z}.enum(["contains", "startsWith", "endsWith", "equals", "not", "gt", "gte", "lt", "lte"]),
  value: ${z}.string(),
});

export const crudRouter = ${router}({
  list: ${protectedProcedure}
    .input(
      modelInput.extend({
        page: ${z}.number().int().min(1).default(1),
        pageSize: ${z}.number().int().min(1).default(20),
        search: ${z}.string().default(""),
        filters: ${z}.array(filterCondition).optional(),
        sortField: ${z}.string().optional(),
        sortOrder: ${z}.enum(["asc", "desc"]).optional(),
      }),
    )
    .query(({ input }) => handlersFor(input.model).list(input)),

  get: ${protectedProcedure}
    .input(modelInput.extend({ id: ${z}.string() }))
    .query(({ input }) => handlersFor(input.model).get(input.id)),

  /** Relation-picker options. \`cursor\` is the page number, so this works with both
   *  queryOptions() and infiniteQueryOptions(). */
  options: ${protectedProcedure}
    .input(modelInput.extend({ search: ${z}.string().default(""), cursor: ${z}.number().int().min(1).nullish() }))
    .query(({ input }) => handlersFor(input.model).options(input.cursor ?? 1, input.search.trim())),

  create: ${protectedProcedure}
    .input(modelInput.extend({ data: ${z}.record(${z}.string(), ${z}.unknown()) }))
    .mutation(({ input }) => handlersFor(input.model).create(input.data)),

  update: ${protectedProcedure}
    .input(modelInput.extend({ id: ${z}.string(), data: ${z}.record(${z}.string(), ${z}.unknown()) }))
    .mutation(({ input }) => handlersFor(input.model).update(input.id, input.data)),

  delete: ${protectedProcedure}
    .input(modelInput.extend({ id: ${z}.string() }))
    .mutation(({ input }) => handlersFor(input.model).delete(input.id)),

  deleteMany: ${protectedProcedure}
    .input(modelInput.extend({ ids: ${z}.array(${z}.string()).min(1, "No ids provided") }))
    .mutation(({ input }) => handlersFor(input.model).deleteMany(input.ids)),

  deleteAll: ${protectedProcedure}
    .input(modelInput)
    .mutation(({ input }) => handlersFor(input.model).deleteAll()),
});
`
}

export default writeCrudRouter;
