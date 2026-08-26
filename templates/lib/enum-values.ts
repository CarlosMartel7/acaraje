import { code } from "ts-poet";

export const writeEnumValues = () => code`
/**
 * Resolves a field's constrained-choice values, whether from a real Prisma \`enum\` or the
 * \`// @enum A | B | C\` pseudo-enum comment convention (\`lib/schema-parser.ts\`) used on providers
 * with no native \`enum\` keyword (SQLite). Pure, no Node imports — safe to import from both API
 * routes and client components (unlike \`lib/schema-parser.ts\`, which reads the filesystem).
 */

interface EnumLike {
  name: string;
  values: string[];
}

interface FieldLike {
  type: string;
  pseudoEnumValues?: string[];
}

export function getEnumValues(field: FieldLike, enums: EnumLike[]): string[] | undefined {
  return enums.find((e) => e.name === field.type)?.values ?? field.pseudoEnumValues;
}
`;

export default writeEnumValues;
