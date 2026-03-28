/**
 * 番号付き英単語リスト（PDF または .txt）から英語＋和訳を抽出し、
 * data/seed/eiken-grade2-level.json を生成する。
 * 英検２級レベル向け公式単語帳のシード用。
 *
 * 使い方:
 *   node scripts/parse-eiken-grade2.mjs "/path/to/source.pdf"
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PDFParse } from "pdf-parse";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../data/seed/eiken-grade2-level.json");

/** @param {string} text */
export function parseNumberedVocabLines(text) {
  const lines = text.split(/\r?\n/);
  /** @type {{ front: string; back: string; sort_order: number }[]} */
  const out = [];
  let order = 0;
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (/^--\s*\d+\s+of\s+\d+\s+--$/.test(t)) continue;
    let m = t.match(/^(\d+)\s+(.+?)\t+(.+)$/);
    if (!m) m = t.match(/^(\d+)\s+(.+?)\s{2,}(.+)$/);
    if (!m) continue;
    const front = m[2].trim();
    const back = m[3].trim();
    if (!front || !back) continue;
    out.push({ front, back, sort_order: order });
    order += 1;
  }
  return out;
}

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("Usage: node scripts/parse-eiken-grade2.mjs <path-to-pdf-or-txt>");
    process.exit(1);
  }

  let text;
  if (inputPath.toLowerCase().endsWith(".txt")) {
    text = readFileSync(inputPath, "utf8");
  } else {
    const data = readFileSync(inputPath);
    const parser = new PDFParse({ data: new Uint8Array(data) });
    const result = await parser.getText();
    await parser.destroy();
    text = result.text;
  }

  const entries = parseNumberedVocabLines(text);
  if (entries.length < 100) {
    console.error(`Parsed only ${entries.length} entries — check input format.`);
    process.exit(1);
  }

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(entries, null, 0), "utf8");
  console.log(`Wrote ${entries.length} entries to ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
