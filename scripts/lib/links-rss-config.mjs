import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

export function isLinksRssEnabled(root = join(import.meta.dirname, '../..')) {
  try {
    const out = execSync('hugo config --format json', {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    const cfg = JSON.parse(out)
    return cfg.params?.links?.rssenable === true
  } catch (err) {
    console.warn(
      '[links-rss] 无法读取 hugo 配置（hugo 是否在 PATH 中？），本次按“未启用”处理：',
      err?.message || err,
    )
    return false
  }
}

export function writeEmptyLinksRss(outputPath) {
  writeFileSync(
    outputPath,
    `${JSON.stringify({ updatedAt: new Date().toISOString(), feeds: [] }, null, 2)}\n`,
    'utf8',
  )
}
