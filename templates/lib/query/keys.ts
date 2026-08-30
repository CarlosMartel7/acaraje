import { code } from "ts-poet";

export const writeQueryKeys = () => code`
/** Central query-key factory — keep API-route consumers in sync so invalidation stays reliable. */
export const queryKeys = {
  schemas: ["schemas"] as const,
  relations: ["relations"] as const,
  stats: ["stats"] as const,
  crud: {
    list: (model: string, params: Record<string, unknown>) => ["crud", model, "list", params] as const,
    detail: (model: string, id: string) => ["crud", model, "detail", id] as const,
    options: (model: string, search: string = "") => ["crud", model, "options", search] as const,
    all: (model: string) => ["crud", model] as const,
  },
  drive: {
    folders: ["drive", "folders"] as const,
    contents: (prefix: string) => ["drive", "contents", prefix] as const,
  },
  seed: {
    counts: ["seed", "counts"] as const,
    config: ["seed", "config"] as const,
  },
};
`;

export default writeQueryKeys;
