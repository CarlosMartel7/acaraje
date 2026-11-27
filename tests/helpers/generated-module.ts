import fs from "fs";
import path from "path";
import { transformSync } from "@swc/core";

/**
 * Loads a file the generator wrote into `appDir` and runs it as CommonJS, so tests can call the
 * generated code instead of only matching its text. `@/...` imports resolve inside `appDir` (the
 * generated app's tsconfig alias) and relative imports next to the importing file; any module
 * named in `stubs` is replaced by the given object (e.g. "next/server", "@/lib/prisma");
 * everything else goes through Node's `require`.
 */
export function loadGeneratedModule(appDir: string, file: string, stubs: Record<string, unknown> = {}): any {
  const cache = new Map<string, { exports: any }>();

  const resolveFile = (base: string, id: string) => {
    for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")]) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
    }
    throw new Error(`Generated module not found: ${id} (looked for ${base})`);
  };

  const load = (filePath: string): any => {
    const cached = cache.get(filePath);
    if (cached) return cached.exports;

    const { code } = transformSync(fs.readFileSync(filePath, "utf-8"), {
      filename: filePath,
      jsc: { parser: { syntax: "typescript", tsx: filePath.endsWith(".tsx") }, target: "es2022" },
      module: { type: "commonjs" },
    });

    const mod = { exports: {} as any };
    cache.set(filePath, mod);
    const localRequire = (id: string) => {
      if (Object.prototype.hasOwnProperty.call(stubs, id)) return stubs[id];
      if (id.startsWith("@/")) return load(resolveFile(path.join(appDir, id.slice(2)), id));
      if (id.startsWith(".")) return load(resolveFile(path.resolve(path.dirname(filePath), id), id));
      return require(id);
    };
    new Function("require", "module", "exports", code)(localRequire, mod, mod.exports);
    return mod.exports;
  };

  return load(path.join(appDir, file));
}

/** Minimal "next/server" for calling generated route handlers outside Next.js. */
export const nextServerStub = {
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({ status: init?.status ?? 200, body }),
  },
};

/** Minimal "@trpc/server" error, carrying the tRPC code the handlers throw with. */
export class TRPCErrorStub extends Error {
  code: string;
  constructor(opts: { code: string; message?: string }) {
    super(opts.message);
    this.code = opts.code;
  }
}

/** Minimal "@/server/trpc/init" for calling generated tRPC handlers directly. */
export const trpcInitStub = {
  internalError: (err: unknown) => {
    throw err;
  },
};
