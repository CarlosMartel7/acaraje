import fs from "fs";
import path from "path";

export type LogType = "json" | "folder" | "no-logs";

/**
 * "json" (default): each writeLog() overwrites tests/logs/<name>.log.json with a JSON dump of
 * the run's data.
 * "folder": nothing is overwritten — every run copies the actual generated output directories
 * (the `dirs` argument) into a fresh timestamped folder under tests/results/<name>/, so you can
 * browse the real generated files and folders exactly as the CLI would have produced them.
 * "no-logs": writeLog() is a no-op — nothing is written anywhere.
 *
 * Override with the TEST_LOG_TYPE env var, e.g. `TEST_LOG_TYPE=folder npm test`.
 */
export const logType: LogType =
  process.env.TEST_LOG_TYPE === "folder" || process.env.TEST_LOG_TYPE === "no-logs"
    ? process.env.TEST_LOG_TYPE
    : "json";

const LOGS_DIR = path.join(__dirname, "logs");
const RESULTS_DIR = path.join(__dirname, "results");

/**
 * Records this run's output under `name`.
 * - json mode: writes `data` to tests/logs/<name>.log.json (overwritten every run).
 * - folder mode: ignores `data` and instead copies each directory in `dirs` (label -> path on
 *   disk, e.g. `{ prisma: outDir }`) into tests/results/<name>/<timestamp>/. A single entry is
 *   copied directly into that timestamped folder; multiple entries each get their own
 *   label-named subfolder inside it.
 * - no-logs mode: does nothing.
 */
export function writeLog(name: string, data: unknown, dirs?: Record<string, string>): void {
  if (logType === "no-logs") return;

  if (logType === "folder") {
    if (!dirs || Object.keys(dirs).length === 0) return;

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const runDir = path.join(RESULTS_DIR, name, timestamp);
    const entries = Object.entries(dirs);

    for (const [label, srcDir] of entries) {
      const dest = entries.length === 1 ? runDir : path.join(runDir, label);
      fs.mkdirSync(dest, { recursive: true });
      fs.cpSync(srcDir, dest, { recursive: true });
    }
    return;
  }

  fs.mkdirSync(LOGS_DIR, { recursive: true });
  const filePath = path.join(LOGS_DIR, `${name}.log.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}
