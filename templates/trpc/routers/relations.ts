import { code, imp } from "ts-poet";

const router = imp("router@@/server/trpc/init")
const protectedProcedure = imp("protectedProcedure@@/server/trpc/init")
const internalError = imp("internalError@@/server/trpc/init")
const parsedSchema = imp("parsedSchema@@/lib/parsed-schema")

// Mirrors templates/api/relations/route.ts — keep both in sync.
export const writeRelationsRouter = () => code`
export const relationsRouter = ${router}({
  list: ${protectedProcedure}.query((): { relations: Relations.Relation[] } => {
    try {
      return { relations: ${parsedSchema}.relations as Relations.Relation[] };
    } catch (err) {
      ${internalError}(err, "Failed to parse relations");
    }
  }),
});
`;

export default writeRelationsRouter;
