import { code } from "ts-poet";

// Written to server/trpc/routers/crud/types.ts. Every generated server/trpc/routers/crud/models/
// <Model>.ts implements this — the prisma and kysely flavors only differ in how they do it.
export const writeCrudTypes = () => code`
export interface CrudListInput {
  page: number;
  pageSize: number;
  search: string;
  filters?: Crud.FilterCondition[];
  sortField?: string;
  sortOrder?: Crud.SortOrder;
}

export interface CrudHandlers {
  list(input: CrudListInput): Promise<Crud.PageData>;
  get(id: string): Promise<Crud.RecordRow>;
  create(data: Record<string, unknown>): Promise<Crud.RecordRow>;
  update(id: string, data: Record<string, unknown>): Promise<Crud.RecordRow>;
  delete(id: string): Promise<{ success: true }>;
  deleteMany(ids: string[]): Promise<{ success: true; deleted: number }>;
  deleteAll(): Promise<{ success: true; deleted: number }>;
  options(page: number, search: string): Promise<Crud.OptionsPage>;
}
`;

export default writeCrudTypes;
