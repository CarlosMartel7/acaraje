import { code, imp } from "ts-poet";

const router = imp("router@@/server/trpc/init")
const protectedProcedure = imp("protectedProcedure@@/server/trpc/init")
const internalError = imp("internalError@@/server/trpc/init")
const parsedSchema = imp("parsedSchema@@/lib/parsed-schema")

// Mirrors templates/api/schemas/route.ts — keep both in sync.
export const writeSchemasRouter = () => code`
export const schemasRouter = ${router}({
  get: ${protectedProcedure}.query((): Schema.SchemaData => {
    try {
      return {
        models: ${parsedSchema}.models,
        enums: ${parsedSchema}.enums,
        relations: ${parsedSchema}.relations,
        datasource: ${parsedSchema}.datasource,
        generator: ${parsedSchema}.generator,
      } as Schema.SchemaData;
    } catch (err) {
      ${internalError}(err, "Failed to parse schema");
    }
  }),
});
`;

export default writeSchemasRouter;
