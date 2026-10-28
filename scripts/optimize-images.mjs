// 把「图库/」里的原始素材压缩成 webp，输出到 static/gallery/
//
// 用法：
//   pnpm run images            # 增量：只转新增或有改动的源图
//   pnpm run images -- --force # 全部重转（覆盖已有 webp）
//   pnpm run images -- --dry-run   # 只打印计划，不写文件
//
// 设计约定：
//   - 最长边不超过 MAX_WIDTH（默认 1600），小图不放大
//   - 自动按 EXIF Orientation 摆正
//   - 保留透明通道（png → webp alpha）
//   - 输出文件名 = 源文件名去扩展名 + .webp
//   - 不做删除：源图删了不会自动删 webp，只会在结尾提示孤儿文件

import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { basename, extname, join } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE_DIR = join(ROOT, '图库')
const DEST_DIR = join(ROOT, 'static/gallery')

const MAX_WIDTH = Number.parseInt(process.env.IMAGE_MAX_WIDTH ?? '1600', 10)
// 默认值与仓库里现有那批 webp 的生成参数一致（实测 q80/e6 与旧图体积几乎完全吻合），
// 这样 --force 重转不会让已经上线的图突然变胖。
const QUALITY = Number.parseInt(process.env.IMAGE_WEBP_QUALITY ?? '80', 10)
const EFFORT = Number.parseInt(process.env.IMAGE_WEBP_EFFORT ?? '6', 10)
const INPUT_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff'])

const argv = new Set(process.argv.slice(2).filter((a) => a !== '--'))
const FORCE = argv.has('--force') || argv.has('-f')
const DRY_RUN = argv.has('--dry-run') || argv.has('-n')

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`
}

function listSources() {
  if (!existsSync(SOURCE_DIR)) {
    console.error(`[images] 找不到源目录：${SOURCE_DIR}`)
    process.exit(1)
  }
  return readdirSync(SOURCE_DIR)
    .filter((name) => INPUT_EXT.has(extname(name).toLowerCase()))
    .filter((name) => statSync(join(SOURCE_DIR, name)).isFile())
    .sort()
}

async function convert(name) {
  const src = join(SOURCE_DIR, name)
  const out = join(DEST_DIR, `${basename(name, extname(name))}.webp`)

  const srcStat = statSync(src)
  const needsWork =
    FORCE || !existsSync(out) || statSync(out).mtimeMs < srcStat.mtimeMs
  if (!needsWork) return { name, skipped: true }

  const srcSize = srcStat.size
  if (DRY_RUN) {
    return { name, out, srcSize, dryRun: true }
  }

  const buf = await sharp(src)
    .rotate() // 按 EXIF 摆正
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY, effort: EFFORT })
    .toBuffer()

  writeFileSync(out, buf)
  return { name, out, srcSize, outSize: buf.length }
}

function reportOrphans(sources) {
  const expected = new Set(sources.map((n) => `${basename(n, extname(n))}.webp`))
  if (!existsSync(DEST_DIR)) return []
  return readdirSync(DEST_DIR)
    .filter((n) => n.toLowerCase().endsWith('.webp'))
    .filter((n) => !expected.has(n))
}

async function main() {
  const sources = listSources()
  mkdirSync(DEST_DIR, { recursive: true })

  console.log(`[images] 源目录 ${SOURCE_DIR}  共 ${sources.length} 个可转换文件`)
  console.log(`[images] 参数 最长边=${MAX_WIDTH} 质量=${QUALITY} effort=${EFFORT}` +
    `${FORCE ? '  [force]' : ''}${DRY_RUN ? '  [dry-run]' : ''}\n`)

  let converted = 0
  let skipped = 0
  let totalIn = 0
  let totalOut = 0

  for (const name of sources) {
    let r
    try {
      r = await convert(name)
    } catch (err) {
      console.error(`  ✗ ${name}  转换失败: ${err.message}`)
      process.exitCode = 1
      continue
    }

    if (r.skipped) {
      skipped += 1
      continue
    }

    if (r.dryRun) {
      console.log(`  · ${name}  →  ${basename(r.out)}  (待写入，源 ${kb(r.srcSize)})`)
      converted += 1
      continue
    }

    converted += 1
    totalIn += r.srcSize
    totalOut += r.outSize
    const ratio = r.srcSize > 0 ? Math.round((1 - r.outSize / r.srcSize) * 100) : 0
    console.log(`  ✓ ${name.padEnd(34)} ${kb(r.srcSize).padStart(9)} → ${kb(r.outSize).padStart(9)}  -${ratio}%`)
  }

  console.log('')
  if (converted && !DRY_RUN) {
    console.log(`[images] 完成：转换 ${converted} 个，跳过 ${skipped} 个（无改动）`)
    console.log(`[images] 体积：${kb(totalIn)} → ${kb(totalOut)}` +
      (totalIn ? `（省 ${Math.round((1 - totalOut / totalIn) * 100)}%）` : ''))
  } else if (DRY_RUN) {
    console.log(`[images] dry-run：待转换 ${converted} 个，跳过 ${skipped} 个（无改动）`)
  } else {
    console.log(`[images] 无需转换（全部 ${skipped} 个已是最新）。加 --force 可强制重转。`)
  }

  const orphans = reportOrphans(sources)
  if (orphans.length) {
    console.log('')
    console.log(`[images] 提示：static/gallery 下有 ${orphans.length} 个 webp 在「图库/」里没有对应源图：`)
    for (const o of orphans) console.log(`  ? ${o}`)
    console.log('[images] 如果确认不再使用，请手动删除，并检查 hugo.toml / 文章 front matter 是否还引用。')
  }
}

main().catch((err) => {
  console.error('[images] 未捕获错误:', err)
  process.exit(1)
})
