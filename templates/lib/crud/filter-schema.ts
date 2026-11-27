import { code, imp } from "ts-poet";

const parsedSchema = imp("parsedSchema@@/lib/parsed-schema");
const buildFilterSchema = imp("buildFilterSchema@@/lib/crud/resolve-filters");

// Written to lib/crud/filter-schema.ts: every model's filter/sort metadata (fields, enum values,
// relations, search fields, default order), derived once per server process from the generated
// parsed schema. The filter bar derives the same thing from /api/schemas.
const writeFilterSchema = () => code`
/** Filter and sort metadata for every model, shared by all list endpoints. */
export const filterSchema = ${buildFilterSchema}(${parsedSchema});
`;

export default writeFilterSchema;
