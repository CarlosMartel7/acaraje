import fs from "fs";
import path from "path";

const LOGS_DIR = path.join(__dirname, "logs");

/** Overwrites tests/logs/<name>.log.json with the parser output from the latest run. */
export function writeLog(name: string, data: unknown): void {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
  const filePath = path.join(LOGS_DIR, `${name}.log.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}
