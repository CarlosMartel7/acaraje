import { code } from "ts-poet";

export const writeParsedSchema = (schema: PrismaSchema.ParsedSchema) => code`
export const parsedSchema: PrismaSchema.ParsedSchema = ${schema};
`;

export default writeParsedSchema;
