import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const source = resolve("env.json");
const target = resolve("dist", "env.json");

if (!existsSync(source)) {
  throw new Error("Missing env.json; cannot copy frontend runtime config.");
}

mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);
