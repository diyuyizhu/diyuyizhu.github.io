---
title: '驾驭 Claude Code 手册'
date: 2026-05-12
description: '一份面向实践的 Claude Code 使用手册：agent loop 心智模型、多开会话与 subagent、配置分层架构、连接知识库与 RAG、工作流纪律。'
draft: false
tags: [Claude Code, AI编程, 效率工具, 工作流, RAG]
categories: [技术]
source: '🤖-AI/驾驭ClaudeCode手册.md'
---

# 驾驭 Claude Code 手册

## 适用场景

- 学习如何让 Claude Code 按你的意图稳定干活
- 管理多开会话、subagent、公用配置（skills / MCP）
- 连接知识库、做 RAG、跑工作流

## 一、核心心智模型

Claude Code 是一个 **agent loop**：说话 → 规划 → 调工具（读 / 写 / 跑命令 / 搜网）→ 看结果 → 再行动。

可驾驭的三个层面：

1. **怎么跟它说话** —— CLAUDE.md 指令、提示词
2. **给它配什么装备** —— skills / MCP / agents / hooks
3. **让它怎么跑** —— 模式、权限、并行、工作流

## 二、多开：agents 与 subagents

| 需求 | 做法 |
|------|------|
| 多开独立会话 | 多个终端各跑一个 `claude`；独立上下文，用 `/resume` 恢复旧会话 |
| 会话内并行干活 | Agent 工具（subagent）：派任务后后台跑，完成自动通知，主任务不中断 |
| 多视角 / 大搜索 | subagent 类型按需选：`Explore`（只回结论）、`general-purpose`（全能）、`Plan`（架构设计）、`claude-code-guide`（咨询 Claude Code 本身） |
| 隔离改动 | subagent 用 `worktree` 隔离，各干各的不冲突 |
| 确定性编排 | Workflow 工具：脚本派发几十个 agent 并行（需显式提出才触发） |

## 三、功能清单

**内置命令**

- `/help` 帮助、`/clear` 清空上下文、`/compact` 压缩上下文
- `/resume` 恢复会话、`/init` 生成项目 CLAUDE.md、`/permissions` 管理权限

**常用工具**

- 读写：`Read / Write / Edit`
- 执行：`Bash / PowerShell`
- 搜索：`Grep / Glob`（代码）、`WebSearch / WebFetch`（资料）
- 编排：`Agent`（派子任务）、`Workflow`（多 agent 编排）
- 控制：`TaskStop` 停任务、`TaskList` 看任务、`CronCreate` 定时、`Monitor` 盯日志

**模式**

- plan mode：只规划不动手，先批准再实现
- permission modes：按需 / 自动授权
- auto-accept：自动同意常规操作

## 四、配置分层架构

```
全局（所有项目生效）   → ~/.claude/         CLAUDE.md、skills、agents、settings.json
                         ~/.claude.json      MCP（全局 mcpServers）
项目级（当前目录生效） → 项目根目录          CLAUDE.md、.claude/skills、.mcp.json
知识库统一管理（主副本）→ <主知识库>\.agents\  skills + mcp，git 版本控制
```

**落地实践**

- 全局 skills 与 `~/.agents/skills` 均通过 junction 指向知识库的 `.agents/skills` 主副本，改动即自动生效
- 若干全局 MCP 服务器（如漏洞扫描、代理转发、浏览器调试等）同步到 `~/.claude.json`，主副本在 `.agents/mcp/mcp.json`
- 项目级 `.mcp.json` 只放项目专属服务器，不与全局重复

**新增 skill / MCP 的标准流程**

1. 先改知识库主副本（`.agents/skills/` 或 `.agents/mcp/mcp.json`，同步更新 `README.md` 清单）
2. 再同步生效（skills 经 junction 自动生效；MCP 用 `claude mcp add <name> --scope user`）
3. 最后在知识库 git 仓库 commit 记录变更

## 五、初始化 & 连接知识库

- `/init`：扫描项目，自动生成项目级 CLAUDE.md
- 连接知识库：全局 CLAUDE.md 写死"主知识库"路径，并配套多个 Obsidian 相关 skills + obsidian CLI
  - 默认所有 Obsidian 操作针对主库
  - 其他 vault 仅**只读**访问，且需用户明确指令
- Obsidian 连接方式：Skills + obsidian CLI（经 IPC 与运行中的 Obsidian 通信），而非 MCP

## 六、RAG（检索增强）

Claude Code 的 RAG 是一个**检索管道**，无需单独向量库：

1. **CLAUDE.md 定向** —— 全局指令钉死检索范围（优先主库）
2. **skills 主动搜索** —— 多个 Obsidian skill 对主库做 search / read / write
3. **Bases 数据库** —— 主库的 `.base` 文件用 filters / formulas 做结构化索引
4. 需要语义检索时再加 Embedding 向量库（锦上添花，非必需）

## 七、工作流纪律

- **约定驱动**：CLAUDE.md 写死"中文、先读再改、重要操作先确认"
- **版本控制兜底**：知识库和项目都是 git 仓库，改动可回滚
- **用完即沉淀**：重要发现 → 同步进知识库 → commit
- **上下文纪律**：接近 100% 时用 `/compact`；换大任务 `/clear`；隔天继续用 `/resume`

## 延伸阅读

- MCP
- RAG
- 提示词工程 / MOC
