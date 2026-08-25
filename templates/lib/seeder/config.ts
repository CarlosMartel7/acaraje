import { code, imp } from "ts-poet";

const fs = imp("fs=fs")
const path = imp("path=path")

export const writeSeederConfig = () => code`
const DEFAULT_OPTIONAL_NULL_CHANCE = 0.3;

function configPath(): string {
  return ${path}.join(process.cwd(), "acaraje.seeder.json");
}

export function defaultConfig(): Seeder.ConfigFile {
  return { optionalNullChance: DEFAULT_OPTIONAL_NULL_CHANCE, models: {} };
}

export function readSeederConfig(): Seeder.ConfigFile {
  const filePath = configPath();
  if (!${fs}.existsSync(filePath)) {
    const config = defaultConfig();
    writeSeederConfig(config);
    return config;
  }
  const parsed = JSON.parse(${fs}.readFileSync(filePath, "utf-8")) as Seeder.ConfigFile;
  return normalizeConfig(parsed);
}

export function writeSeederConfig(config: Seeder.ConfigFile): void {
  ${fs}.writeFileSync(configPath(), JSON.stringify(normalizeConfig(config), null, 2) + "\\n", "utf-8");
}

function normalizeConfig(config: Seeder.ConfigFile): Seeder.ConfigFile {
  const chance = config.optionalNullChance ?? DEFAULT_OPTIONAL_NULL_CHANCE;
  return {
    optionalNullChance: Math.min(1, Math.max(0, chance)),
    models: config.models ?? {},
  };
}

export function getFieldRule(modelName: string, fieldName: string): Seeder.FieldGenerator | undefined {
  return readSeederConfig().models[modelName]?.[fieldName];
}

export function getOptionalNullChance(): number {
  return readSeederConfig().optionalNullChance ?? DEFAULT_OPTIONAL_NULL_CHANCE;
}

export function setModelRules(modelName: string, rules: Seeder.ModelRules): Seeder.ConfigFile {
  const config = readSeederConfig();
  if (Object.keys(rules).length === 0) {
    delete config.models[modelName];
  } else {
    config.models[modelName] = rules;
  }
  writeSeederConfig(config);
  return config;
}

export function updateSeederConfig(patch: Partial<Pick<Seeder.ConfigFile, "optionalNullChance" | "models">>): Seeder.ConfigFile {
  const config = readSeederConfig();
  if (patch.optionalNullChance !== undefined) {
    config.optionalNullChance = patch.optionalNullChance;
  }
  if (patch.models !== undefined) {
    config.models = patch.models;
  }
  writeSeederConfig(config);
  return config;
}
`;

export default writeSeederConfig;
