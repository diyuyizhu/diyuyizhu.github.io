import { mkdir, writeFile, access, readdir } from "node:fs/promises";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const BASE =
  "https://raw.githubusercontent.com/AIOVTUE/hugo-theme-aiovtue/main/static";
const ENVELOPE_FILES = ["before.png", "after.png", "cover.png", "line.png"];

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function download(url, dest) {
  if (await exists(dest)) return false;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  return true;
}

async function fetchEnvelopeAssets(envelopeDir) {
  await mkdir(envelopeDir, { recursive: true });

  const missing = [];
  for (const name of ENVELOPE_FILES) {
    if (!(await exists(join(envelopeDir, name)))) missing.push(name);
  }
  if (!missing.length) return;

  for (const name of missing) {
    const dest = join(envelopeDir, name);
    await download(`${BASE}/envelope/${name}`, dest);
    console.log(`envelope/${name}: ok`);
  }
}

async function fetchFontAssets(fontDir) {
  await mkdir(fontDir, { recursive: true });

  const existing = await readdir(fontDir).catch(() => []);
  if (existing.length > 0) return;

  const api = await fetch(
    "https://api.github.com/repos/AIOVTUE/hugo-theme-aiovtue/contents/static/fonts/lxgw-wenkai-screen/files?ref=main",
  );
  if (!api.ok) throw new Error(`font list ${api.status}`);
  const files = await api.json();
  let downloaded = 0;
  for (const file of files) {
    const dest = join(fontDir, file.name);
    if (await download(file.download_url, dest)) downloaded++;
  }
  if (downloaded > 0) console.log(`fonts: ${downloaded} downloaded`);
}

async function main() {
  await fetchEnvelopeAssets(join(ROOT, "static/envelope"));
  await fetchFontAssets(join(ROOT, "static/fonts/lxgw-wenkai-screen/files"));
}

main().catch(async (err) => {
  // 本脚本只负责“补齐缺失文件”，目标资源多数已入库；
  // 网络不可用不应阻断 dev/build，只在确实仍缺关键资源时才失败。
  console.warn("[fetch-static] 网络获取失败，跳过补齐：", err?.message || err);

  const missing = [];
  for (const name of ENVELOPE_FILES) {
    if (!(await exists(join(ROOT, "static/envelope", name)))) missing.push(`envelope/${name}`);
  }

  const fontDir = join(ROOT, "static/fonts/lxgw-wenkai-screen/files");
  const fontsOk = (await readdir(fontDir).catch(() => [])).length > 0;
  if (!fontsOk) missing.push("fonts/lxgw-wenkai-screen/files");

  if (missing.length) {
    console.error(`[fetch-static] 关键资源仍缺失，无法继续：${missing.join(", ")}`);
    process.exit(1);
  }

  console.log("[fetch-static] 现有静态资源齐全，继续构建。");
});
