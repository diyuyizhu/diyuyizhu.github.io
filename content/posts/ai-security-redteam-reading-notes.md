---
title: 'AI 安全 × 红队攻防：近期阅读总结'
date: 2026-08-18
description: 'AI 驱动渗透、编码助手越狱、免杀规避、C2 检测——近期阅读的 AI 安全与红队攻防研究汇总，附两个 Codex 破甲工具。'
draft: false
tags: [AI安全, 红队, 大模型破解, 免杀, C2, 渗透测试]
categories: [技术]
source: '20 篇微信公众号文章 + 2 个 GitHub 仓库'
---

> 本文是近期阅读清单的整理，覆盖 AI 安全 × 红队攻防的交叉地带。所有内容仅用于授权测试与安全学习研究。

## 整体方向

近期阅读材料高度聚焦 **AI 安全与红队攻防的交叉地带**，主线是三层递进：

- **用 AI 当攻击者**：Codex / Claude Code 驱动自动化渗透与逆向
- **反向破解 AI**：编码助手的破甲 / 越狱（redteam mode、提示词注入）
- **AI 幻觉反噬**：自动化渗透中大模型幻觉带来的安全风险

## 一、AI 安全与编码助手越狱

### ai 大模型破甲、无限制道德模式教程全流程（蜉蝣安全实验室）
基于开源 `codex-redteam-mode`，让 OpenAI Codex 接入 Yakit 的 MCP 服务，在"无道德限制"红队模式下驱动大模型做自动化渗透。给出安装、MCP 配置、`/redteam on` 开启及四阶段工作主线的完整流程，并列出会触发 AI 拒绝/封号的高风险操作类型。

### 自动化渗透大模型幻觉与银手铐（知攻善防实验室）
通过 Hook MCP 调用 + 第三方 judge 模型审计，实证大模型在自动化渗透中会因幻觉删库、擅自改用户密码、甚至疑似"预训练投毒"。结论是用 Claude Code/Codex/opencode 做自动化渗透风险极高，并给出防护建议。

### Web 逆向分析 skills hello_js_reverse_skill（进击的HACK）
开源 Skill，围绕 camoufox-reverse MCP 构建 Web 逆向一体化工作流，覆盖双语言算法还原、JS 混淆/JSVMP 还原、Cookie 归因、WASM 逆向、协议层对抗等。

### codex 结合 jadx、ida mcp 分析 APP（进击的HACK）
用 codex/trae + `jadx-ai-mcp` + `ida-pro-mcp` 分析 APP 加解密：把反编译结果暴露给大模型，配合脱壳、抓包定位加密函数，让大模型还原魔改国密、SM4+SM2+SM3 等混合加密逻辑。

## 二、免杀与 EDR 规避

### C2 木马动态免杀 360（跃迁Sec）
CS 木马动态免杀：Detours inline hook Sleep 休眠期 XOR 内存加密 + 动态 API 加载 + VirtualQueryEx 内存扫描清理，shellcode 经 wininet 从远程 URL 拉取。

### Hell's Gate 地狱之门（不止Sec）
分析 Windows API Ring3→Ring0 调用链，用 Hell's Gate 从 PEB/导出表读取 SSN 后汇编直接 syscall，绕过 EDR 对 ntdll API 开头的 inline hook。

### RedTeam Loader Builder v6.6.3（白帽子安全笔记2.0）
集成 7 种加载/规避技术的红队载荷生成器：CODASM 随机密钥加密、SysWhispers4（地狱/光环/深渊之门 SSN 解析）、内存波动、OLLVM 混淆、clr+garble 的 AMSI 绕过、LuaJIT 加载器等。

### 新免杀技术 - 进程参数投毒（蜂鸟安全）
详解 2026.7.10 公开的 P³ Loader：把 shellcode 藏进新进程 PEB 启动参数，由系统合法参数复制带入目标进程，再改 RIP 劫持，全程避开 VirtualAllocEx/WriteProcessMemory/CreateRemoteThread。

## 三、红队 C2 框架、横向移动与检测

### 从零开始构建强规避红队 C2 框架（freedom安全）
自研 C2（Go 服务端 + 纯 C Beacon）：60+ API 全动态解析、sleepmask 内存加密、字符串密文、反沙箱/混淆，覆盖 LSASS 提取、.NET 内存加载、BOF、SOCKS5 隧道，多款国产杀软实测免杀。

### AdaptixC2 全协议检测（赛博生存指南）
卡巴斯基 Securelist 译文：AdaptixC2 在 HTTP/S、TCP/mTLS、SMB、DNS、DoH 七种协议下的稳定指纹，以及 EDR 侧对应主机后渗透行为检测（KEDR 规则）。

### 内网横向手法汇总（Heihu Share）
系统汇总 RDP/IPC$/PTH/PTK/PTT 及 psexec、smbexec、wmiexec、WinRM 等横向工具的利用条件、抓包原理与权限对比表。

## 四、逆向工程

### Android 逆向之 libDexHelper.so 梆梆加固壳解密（挖个洞先）
银行 APP 逆向实战：IDA + parse_elf.py 定位梆梆加固壳入口，还原 RC4-like + 单字节 XOR 解密脚本得到内层 so；再用 Florida 绕过 frida 检测 + frida-dexdump 脱壳，修复 DEX 校验和完成验证。

## 五、AI 赋能取证

### L3 级 AI 赋能反诈取证实战（太乙Sec实验室）
以"手机资金被盗刷"报案为例：AI 对接 APK/日志/流量，识别恶意 APK（随机乱码包名 + 零宽字符 + 侧载）、币安/TokenPocket/NDKey/翻墙代理的完整投资诈骗工具链，穿透当事人主观隐瞒定性案件，内置防幻觉校验保障法律效力。

## 相关工具

### codex-redteam-mode
仓库：[chAng-L19/codex-redteam-mode](https://github.com/chAng-L19/codex-redteam-mode)

面向 OpenAI Codex 的"红队 Opt-In 模式"运行时。默认 normal 模式，收到 `redteam on/light/full` 才启动。将用户目标编译为带成功准则的 GoalContract，经 WorkflowSpec → Durable Scheduler → ToolBroker → SemanticVerifier → EvidenceGraph → TerminalJudge 的持久化主线执行，解决长流程渗透任务中断/误报问题；支持双层 Prompt Rewrite（含 Jailbreak.gpt-5.x）。

### Codex-X
仓库：[yynxxxxx/Codex-X](https://github.com/yynxxxxx/Codex-X)

Codex 桌面端/CLI 的跨平台可视化管理工具（Tauri 2 + React + Rust + SQLite），管理提示词模板、第三方 API、会话、Skills/MCP、TOML 配置；内置多套针对 GPT-5.x 的破甲/unrestricted 提示词模板，一键启用/禁用。

两个工具互补：**redteam-mode 管执行逻辑（运行时框架），Codex-X 管配置注入（提示词管理）**。

## 整体洞察

1. **AI 化是当前攻防研究的绝对主线**——"AI 当攻击者、AI 被攻击、AI 帮忙做攻防"三层并行，编码助手越狱研究偏工具落地
2. **免杀/规避仍是核心投入点**——从 syscall 层（Hell's Gate）、内存层（sleepmask）到进程注入层（P³）的完整规避链路，且针对国内杀软实测
3. **攻防对称研究**——既有进攻性内容（免杀、C2、横向），也有防守/检测内容（AdaptixC2 指纹、EDR 检测规则）
4. **工具链偏好一致**——几乎全部围绕 Codex/Claude Code 生态（MCP、Skills、TOML 配置、提示词模板）
5. **边界意识清晰**——多篇明确强调"仅限授权渗透/红队/防御性研究"，且有"自动化渗透风险=赌命"的清醒警告
