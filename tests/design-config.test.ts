import fs from "fs";
import os from "os";
import path from "path";

import {
  DESIGN_FILE,
  readDesignConfig,
  validateDesignConfig,
  writeDesignConfig,
} from "../src/shared/design-config";

const tmpDirs: string[] = [];
function tmp() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "acaraje-design-"));
  tmpDirs.push(dir);
  return dir;
}

afterAll(() => {
  for (const dir of tmpDirs) fs.rmSync(dir, { recursive: true, force: true });
});

function issuesOf(raw: unknown): string[] {
  const result = validateDesignConfig(raw);
  if (result.ok) throw new Error(`expected ${JSON.stringify(raw)} to be rejected`);
  return result.issues;
}

// The two examples documented in the README.
const BASIC = { DATABASE: { config: { orm: "prisma" } } };
const ADVANCED = {
  PANEL: { config: { name: "Backoffice", api: "trpc", docker: true } },
  DATABASE: { config: { orm: "pure-sql", provider: "postgresql", schemaPath: "/db" } },
  STORAGE: { enable: true, config: { provider: "gcs" } },
};

describe("validateDesignConfig", () => {
  test("fills every omitted setting of the basic README example with its default", () => {
    expect(validateDesignConfig(BASIC)).toEqual({
      ok: true,
      config: {
        PANEL: { config: { name: "Acaraje", api: "rest", docker: false } },
        DATABASE: { config: { orm: "prisma", schemaPath: "/prisma" } },
        STORAGE: { enable: true, config: { provider: "minio" } },
      },
    });
  });

  test("keeps every value of the advanced README example", () => {
    expect(validateDesignConfig(ADVANCED)).toEqual({ ok: true, config: ADVANCED });
  });

  test("defaults the schema folder per ORM", () => {
    const result = validateDesignConfig({
      DATABASE: { config: { orm: "pure-sql", provider: "sqlite" } },
    });
    expect(result.ok && result.config.DATABASE.config.schemaPath).toBe("/database");
  });

  test("trims the panel name, like the prompt does", () => {
    const result = validateDesignConfig({ ...BASIC, PANEL: { config: { name: "  Shop  " } } });
    expect(result.ok && result.config.PANEL.config.name).toBe("Shop");
  });

  test("requires the DATABASE section", () => {
    expect(issuesOf({})).toEqual([expect.stringMatching(/^DATABASE: /)]);
  });

  test("requires a provider in pure-sql mode", () => {
    expect(issuesOf({ DATABASE: { config: { orm: "pure-sql" } } })).toEqual([
      expect.stringMatching(/^DATABASE\.config\.provider: /),
    ]);
  });

  test("rejects a provider in prisma mode, since Prisma reads it from the schema", () => {
    expect(issuesOf({ DATABASE: { config: { orm: "prisma", provider: "mysql" } } })).toEqual([
      'DATABASE.config: Unrecognized key: "provider"',
    ]);
  });

  test("rejects an unsupported ORM, API layer, provider and storage", () => {
    expect(issuesOf({ DATABASE: { config: { orm: "drizzle" } } })).toHaveLength(1);
    expect(issuesOf({ ...BASIC, PANEL: { config: { api: "graphql" } } })).toEqual([
      expect.stringMatching(/^PANEL\.config\.api: /),
    ]);
    expect(issuesOf({ DATABASE: { config: { orm: "pure-sql", provider: "oracle" } } })).toEqual([
      expect.stringMatching(/^DATABASE\.config\.provider: /),
    ]);
    expect(issuesOf({ ...BASIC, STORAGE: { enable: true, config: { provider: "s3" } } })).toEqual([
      expect.stringMatching(/^STORAGE\.config\.provider: /),
    ]);
  });

  test("is strict: unknown sections and unknown keys are errors, not ignored", () => {
    expect(issuesOf({ ...BASIC, AUDIT: { enable: true } })).toEqual(['(root): Unrecognized key: "AUDIT"']);
    expect(issuesOf({ ...BASIC, PANEL: { config: { nmae: "Typo" } } })).toEqual([
      'PANEL.config: Unrecognized key: "nmae"',
    ]);
    expect(issuesOf({ ...BASIC, PANEL: { enable: true } })).toEqual(['PANEL: Unrecognized key: "enable"']);
  });

  test("rejects secrets anywhere in the file and points to .env", () => {
    expect(issuesOf({ ...BASIC, PANEL: { config: { password: "hunter2" } } })).toEqual([
      "PANEL.config.password: secrets must not be stored in acaraje-design.json; keep them in .env",
    ]);
    expect(
      issuesOf({ ...BASIC, STORAGE: { enable: true, config: { provider: "gcs", apiKey: "k" } } }),
    ).toEqual([expect.stringMatching(/^STORAGE\.config\.apiKey: secrets must not be stored/)]);
  });

  test("keeps storage enabled, since every panel currently ships it", () => {
    expect(issuesOf({ ...BASIC, STORAGE: { enable: false } })).toEqual([
      "STORAGE.enable: must be true: every generated panel currently includes storage",
    ]);
  });

  test("applies the prompts' panel name and schema folder rules, reporting every issue at once", () => {
    expect(
      issuesOf({
        PANEL: { config: { name: "a-very-long-panel-name" } },
        DATABASE: { config: { orm: "prisma", schemaPath: "prisma" } },
      }),
    ).toEqual([
      "PANEL.config.name: Panel name cannot exceed 15 characters",
      "DATABASE.config.schemaPath: Schema folder should start with '/'",
    ]);
    expect(issuesOf({ ...BASIC, PANEL: { config: { name: "   " } } })).toEqual([
      "PANEL.config.name: Panel name cannot be empty",
    ]);
  });
});

describe("readDesignConfig / writeDesignConfig", () => {
  test("reports a missing file with the path it looked at", () => {
    const dir = tmp();
    expect(readDesignConfig(dir)).toEqual({
      ok: false,
      issues: [`${DESIGN_FILE} was not found at ${path.join(dir, DESIGN_FILE)}`],
    });
  });

  test("reports invalid JSON", () => {
    const dir = tmp();
    fs.writeFileSync(path.join(dir, DESIGN_FILE), "{not json");
    const result = readDesignConfig(dir);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.issues).toEqual([expect.stringMatching(/^acaraje-design\.json is not valid JSON: /)]);
  });

  test("validates what it reads", () => {
    const dir = tmp();
    fs.writeFileSync(path.join(dir, DESIGN_FILE), JSON.stringify({ DATABASE: { config: { orm: "pure-sql" } } }));
    expect(readDesignConfig(dir).ok).toBe(false);
  });

  test("round-trips the effective design it wrote", () => {
    const dir = tmp();
    const result = validateDesignConfig(ADVANCED);
    if (!result.ok) throw new Error("advanced example should be valid");

    writeDesignConfig(result.config, dir);

    expect(readDesignConfig(dir)).toEqual({ ok: true, config: ADVANCED });
    expect(fs.readFileSync(path.join(dir, DESIGN_FILE), "utf-8")).toMatch(/\n$/);
  });
});
