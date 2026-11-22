import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const publicDir = new URL("../src/frontend/public/", import.meta.url);
const source = await readFile(new URL("icons/icon-512.svg", publicDir));
for (const [name, size] of [
  ["icons/worduel-favicon-v2.png", 32],
  ["icons/worduel-apple-v2.png", 180],
  ["apple-touch-icon.png", 180],
  ["icons/worduel-192-v2.png", 192],
  ["icons/worduel-512-v2.png", 512],
]) {
  await sharp(source).resize(size, size).png().toFile(fileURLToPath(new URL(name, publicDir)));
}
await writeFile(new URL("icons/icon-192.svg", publicDir), source.toString().replaceAll('="512"', '="192"'));
// PNG-backed ICO covers browsers requesting /favicon.ico implicitly.
const png = await sharp(source).resize(32, 32).png().toBuffer();
const header = Buffer.alloc(22);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
header[6] = 32;
header[7] = 32;
header.writeUInt16LE(1, 10);
header.writeUInt16LE(32, 12);
header.writeUInt32LE(png.length, 14);
header.writeUInt32LE(22, 18);
await writeFile(new URL("favicon.ico", publicDir), Buffer.concat([header, png]));
console.log("Generated Worduel home-screen and browser icons.");
