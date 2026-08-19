---
title: 'CTF 经典密码学：云影密码（01248）与培根密码'
date: 2024-02-18
description: 'CTF 常见古典密码速查：云影密码（01248 幂数加密）与培根密码的加密规则、对照表与实战例题'
draft: false
tags: [CTF, 密码学, 古典密码, 云影密码, 培根密码]
categories: [技术]
cover: "/gallery/1584074167225.webp"
source: '🔒-安全/网络安全/CTF专题/密码学.md'
---

CTF 的 Misc / Crypto 题目里经常遇到两类古典密码：一类是用 `01248` 表示的“云影密码”（也叫幂数加密），另一类是培根提出的“培根密码”。本文整理两者的加密规则、对照表与典型例题，方便查阅与实战。

## 云影密码（幂数加密 / 01248）

云影密码又称幂数加密、01248 密码。密文只由 0、1、2、4、8 五个数字组成：

- 1、2、4、8 是四个非零数字，用于承载信息（它们恰好是 2 的 0~3 次幂）；
- 0 用作分隔符，把整串密文切成若干段。

**解密方法**（也是最常用的判断特征）：

1. 按 `0` 将密文分段；
2. 每段内的数字求和；
3. 按 A1Z26（A=1, B=2, …, Z=26）把和映射为字母。

例如经典示例：

```
8842101220480224404014224202480122
```

按 `0` 分段并求和：

| 段   | 88421 | 122 | 48  | 2244 | 4  | 142242 | 248 | 122 |
|------|-------|-----|-----|------|----|--------|-----|-----|
| 求和 | 23    | 5   | 12  | 12   | 4  | 15     | 14  | 5   |
| 字母 | W     | E   | L   | L    | D  | O      | N   | E   |

得到明文 `WELL DONE`。

**特点**：密文只由 0、1、2、4、8 组成；分段求和后落在 1–26 范围内即为字母序号。

## 培根密码

培根密码（Bacon's cipher）由弗朗西斯·培根提出，本质是用 5 位 a/b 编码一个字母。常见的实现有两种对照表：一种是覆盖完整 26 个字母的二进制表（a=0、b=1 的 5 位二进制，编号从 0 开始）；另一种是培根本人的 24 字母表（i 与 j、u 与 v 共用一个码）。

### 方式一：26 字母二进制表

把 a 看作 0、b 看作 1，每组 5 位按二进制转成 0–25（0 对应 A）：

| 字母 | 编码   | 字母 | 编码   |
|------|--------|------|--------|
| A    | aaaaa  | N    | abbab  |
| B    | aaaab  | O    | abbba  |
| C    | aaaba  | P    | abbbb  |
| D    | aaabb  | Q    | baaaa  |
| E    | aabaa  | R    | baaab  |
| F    | aabab  | S    | baaba  |
| G    | aabba  | T    | baabb  |
| H    | aabbb  | U    | babaa  |
| I    | abaaa  | V    | babab  |
| J    | abaab  | W    | babba  |
| K    | ababa  | X    | babbb  |
| L    | ababb  | Y    | bbaaa  |
| M    | abbaa  | Z    | bbaab  |

### 方式二：经典 24 字母培根表

i 与 j 共用 `ABAAA`，u 与 v 共用 `BAABB`：

| 字母 | 编码   | 字母 | 编码   |
|------|--------|------|--------|
| a    | AAAAA  | n    | ABBAA  |
| b    | AAAAB  | o    | ABBAB  |
| c    | AAABA  | p    | ABBBA  |
| d    | AAABB  | q    | ABBBB  |
| e    | AABAA  | r    | BAAAA  |
| f    | AABAB  | s    | BAAAB  |
| g    | AABBA  | t    | BAABA  |
| h    | AABBB  | u/v  | BAABB  |
| i/j  | ABAAA  | w    | BABAA  |
| k    | ABAAB  | x    | BABAB  |
| l    | ABABA  | y    | BABBA  |
| m    | ABABB  | z    | BABBB  |

### 例 1：二进制分组

密文：

```
baabaaabbbabaaabbaaaaaaaaabbabaaaabaaaaaabaaabaabaaaabaabbbaabbbaababb
```

每 5 位一组，按方式一（a=0, b=1）解码，得到：

```
baaba aabbb abaaa bbaaa aaaaa aabba baaaa baaab aabaa baabb aabbb aababb
   S     H     I     Y     A     N     B     A     I     S     C     OO
```

即明文 `SHIYANBA IS COOL`（“实验吧 is cool”，实验吧为早期 CTF 练习平台）。

### 例 2：大小写代表 a / b

明文是 `LOVE`，选取一句普通的句子作为载体，用大写字母代表 a、小写字母代表 b。例如：

```
SuLyi XuanQ uJuZi HEwEN
```

逐字母取其大小写，每 5 个为一组还原：

| 单词    | 大小写模式 | 编码   | 字母 |
|---------|-----------|--------|------|
| SuLyi   | 大小大小小 | ababb  | L    |
| XuanQ   | 大小小小大 | abbba  | O    |
| uJuZi   | 小大小大小 | babab  | V    |
| HEwEN   | 大大小大大 | aabaa  | E    |

合并得到明文 `LOVE`。

### 例 3：双字体法

加密者用两种不同字体准备一篇“假信息”，两种字体分别代表 a 型和 b 型，且假信息中两种字符的数量大致相当（a、b 数量相同，便于配平）。解密时按每个字母的字体决定它代表 a 还是 b，再按培根表还原明文。

### 例 4：覆盖文本法（a–m 与 n–z）

明文 `now is a good t……`，对每个明文单词生成一段“看起来正常”的英文密文：

| 明文 | n | o | w | i | s | a | g | o | o | d | t |
|------|---|---|---|---|---|---|---|---|---|---|---|
| 编码 | abbaa | abbab | babaa | abaaa | baaab | aaaaa | aabba | abbab | abbab | aaabb | baaba |
| 密文 | BOWED | ASTER | PINED | JOKED | THEIR | BLACK | HASTE | ARRAY | INSET | CHEST | SLING |

加密规则：

1. 明文 a–m → a：a 到 m 的所有字母都能替换成 a；
2. 明文 n–z → b：n 到 z 的所有字母都能替换成 b；
3. 编码 a ← a–m：a 可以代表 a 到 m 中的任意一个字母；
4. 编码 b ← n–z：b 可以代表 n 到 z 中的任意一个字母。

即把字母表按 13/13 分成两半，前一半（a–m）视作 a、后一半（n–z）视作 b，再用每个“字母位”拼出 5 位编码。以 `BOWED` 为例：B、E、D 落在 a–m → 编码 a，O、W 落在 n–z → 编码 b，得到 `abbaa` → n。整句依此类推，还原为 `now is a good t…`。

PS：密文中的单词都是根据上述规则随意拼凑出来的；为了使加密更隐蔽，一般会把拼凑出的单词连成一句通顺的话。

## 小结

- **云影密码**：按 `0` 分段 → 段内求和 → A1Z26 映射字母。
- **培根密码**：5 位 a/b 编码；方式一覆盖完整 26 字母（a=0/b=1 的 5 位二进制），方式二为经典 24 字母表（i/j、u/v 共用）。
- 常见的“伪装”手法：大小写区分、两种字体、覆盖文本（a–m → a，n–z → b）。
