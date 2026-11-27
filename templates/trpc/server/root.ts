import { code, imp } from "ts-poet";

const router = imp("router@@/server/trpc/init")
const crudRouter = imp("crudRouter@@/server/trpc/routers/crud")
const schemasRouter = imp("schemasRouter@@/server/trpc/routers/schemas")
const relationsRouter = imp("relationsRouter@@/server/trpc/routers/relations")
const statsRouter = imp("statsRouter@@/server/trpc/routers/stats")
const seedRouter = imp("seedRouter@@/server/trpc/routers/seed")
const driveRouter = imp("driveRouter@@/server/trpc/routers/drive")

export const writeTrpcRoot = () => code`
/** Every generated router lives under server/trpc/routers/ — add your own next to them and
 *  register them here; the client picks them up through the AppRouter type automatically. */
export const appRouter = ${router}({
  crud: ${crudRouter},
  schemas: ${schemasRouter},
  relations: ${relationsRouter},
  stats: ${statsRouter},
  seed: ${seedRouter},
  drive: ${driveRouter},
});

export type AppRouter = typeof appRouter;
`;

export default writeTrpcRoot;
