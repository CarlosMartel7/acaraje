import { prisma } from "@/lib/prisma";

/** Resolves a Prisma model name (e.g. "Product") to its Prisma Client delegate (`prisma.product`). */
export function getDelegate(modelName: string): any {
  const key = modelName.charAt(0).toLowerCase() + modelName.slice(1);
  return (prisma as any)[key];
}
