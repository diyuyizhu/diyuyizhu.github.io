import { execSync, spawnSync } from "node:child_process";
import { chmodSync, existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const LOCK_FILE = join(ROOT, ".hugo_build.lock");
const HUGO_VERSION = process.env.HUGO_VERSION || "0.164.0";

function needsBundledHugo() {
  return (
    process.env.CF_PAGES === "1" ||
    process.env.RENDER === "true" ||
    process.env.VERCEL === "1"
  );
}

function isHugoRunning() {
  try {
    if (process.platform === "win32") {
      const out = execSync('tasklist /FI "IMAGENAME eq hugo.exe" /NH', {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      return /hugo\.exe/i.test(out);
    }
    execSync("pgrep -x hugo", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function ensureBuildReady() {
  if (!existsSync(LOCK_FILE)) return;

  if (isHugoRunning()) {
    console.error(
      "\n[build] 检测到 Hugo 正在运行（常见于 `pnpm dev` 未关闭）。\n" +
      "[build] 请先停止开发服务器，再重新执行 `pnpm run build`。\n",
    );
    process.exit(1);
  }

  try {
    unlinkSync(LOCK_FILE);
    console.warn("[build] 已清除陈旧的 .hugo_build.lock");
  } catch (err) {
    console.error("[build] 无法清除 .hugo_build.lock，请手动删除后重试。");
    console.error(err?.message || err);
    process.exit(1);
  }
}

function resolveHugoBin() {
  if (!needsBundledHugo()) {
    return { bin: "hugo", env: process.env };
  }

  const binDir = "/tmp/hugo-bin";
  const bin = join(binDir, "hugo");

  if (!existsSync(bin)) {
    const archive = `hugo_extended_${HUGO_VERSION}_linux-amd64.tar.gz`;
    const url = `https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/${archive}`;
    execSync(`mkdir -p "${binDir}" && curl -sL "${url}" | tar xz -C "${binDir}"`, {
      stdio: "inherit",
    });
    chmodSync(bin, 0o755);
  }

  return {
    bin,
    env: { ...process.env, PATH: `${binDir}:${process.env.PATH ?? ""}` },
  };
}

function runStep(label, command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: "inherit",
    ...options,
  });

  if (result.error) {
    console.error(`[build] ${label} 启动失败:`, result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`[build] ${label} 失败，退出码 ${result.status ?? "unknown"}`);
    process.exit(result.status || 1);
  }
}

ensureBuildReady();

// fetch 脚本用 `hugo config --format json` 探测功能开关，所以必须先解析 hugo，
// 并把 bundled 分支的 binDir 注入 PATH；否则探测静默失败，写出空的 data/*.json。
const hugo = resolveHugoBin();

runStep("fetch-static", process.execPath, ["scripts/fetch-missing-static.mjs"], { env: hugo.env });
runStep("fetch-links-rss", process.execPath, ["scripts/fetch-links-rss.mjs"], { env: hugo.env });
runStep("fetch-bangumi", process.execPath, ["scripts/fetch-bangumi.mjs"], { env: hugo.env });

const hugoArgs = ["--cleanDestinationDir", "--minify"];

const baseURL = process.env.CF_PAGES_URL
  || process.env.RENDER_EXTERNAL_URL
  || process.env.GITHUB_PAGES_URL
  || process.env.URL
  || process.env.DEPLOY_PRIME_URL;
if (baseURL) {
  hugoArgs.push("--baseURL", baseURL.endsWith("/") ? baseURL : `${baseURL}/`);
}

runStep("hugo", hugo.bin, hugoArgs, { env: hugo.env });
