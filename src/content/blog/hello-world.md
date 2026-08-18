---
title: 你好，世界
summary: 新博客的第一篇文章，用来占位并验证内容管线、目录与代码高亮。
pubDate: 2026-08-18
categories: 技术栈
tags: [Astro, 随笔]
draft: false
---

## 欢迎来到新博客

这是重构后的第一篇占位文章，用于验证整条内容管线是否正常：

- 内容集合（Content Collections）读取 Markdown
- 文章详情页与侧边目录（TOC）渲染
- 代码语法高亮（Shiki）

## 二级标题示例

目录会抓取 `h2` / `h3` 生成锚点列表，点击即可跳转。

### 三级标题

文章正文支持完整的 Markdown 语法：**加粗**、*斜体*、[链接](https://astro.build)、`行内代码`、引用、列表、表格等。

> 这是一个引用块，用于验证引用样式。

## 代码高亮示例

```python
def hello(name: str) -> str:
    """简单示例函数"""
    return f"Hello, {name}!"

print(hello("diyuyizhu"))
```

```javascript
// JavaScript 示例
const blog = { framework: "Astro", style: "明亮简洁" };
console.log(blog);
```

## 后续

删除本段占位内容，替换为你的真实笔记即可。新文章直接在 `src/content/blog/` 下新建 `.md` 文件，推送后自动构建发布。
