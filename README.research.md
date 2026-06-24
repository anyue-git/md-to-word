# Markdown 转 Word / DOCX 方案调研与 Codex 实现说明

## 当前项目快速开始

本仓库已经按本文推荐路线初始化为 Node.js / TypeScript 项目，默认使用本机 Pandoc 转换 Markdown 到 Word `.docx`。当前机器已检测到：

```bash
pandoc 3.9.0.2
node v22.22.3
npm 10.9.8
```

因此当前不需要 Docker。Docker 只适合后续需要固定运行环境、CI 镜像或部署为服务时再引入。

安装依赖：

```bash
npm install
```

生成默认 Word 样式模板：

```bash
npm run generate:reference
```

构建并运行测试：

```bash
npm test
```

转换示例：

```bash
npm run build
node dist/cli.js tests/fixtures/complex.md -o tmp/complex.docx --reference-doc assets/reference.docx --toc --number-sections
```

CLI 用法：

```bash
md2docx input.md -o output.docx
md2docx input.md -o output.docx --reference-doc assets/reference.docx
md2docx input.md -o output.docx --toc --number-sections
md2docx input.md -o output.docx --allow-remote-images
md2docx input.md -o output.docx --preserve-html
```

已实现内容：

* `convertMarkdownToDocx(options)` TypeScript API
* `md2docx` CLI
* Pandoc 可用性检测
* `.docx` 输出路径校验
* 本地 Markdown 文件和 Markdown 字符串输入
* `reference.docx` 支持
* 资源路径支持
* 目录、章节编号、标题、作者、代码高亮参数
* 默认禁止远程图片
* 基础 Lua filter
* 集成测试 fixture

后续可继续加强：

* 更完整的 HTML / span color 到 Word 样式映射
* 安全的远程图片下载、内网地址阻断和大小限制
* `markdown-docx` fallback
* 更深入的 `.docx` XML 内容断言

## 结论

推荐主方案：

**Pandoc 优先 + Word `reference.docx` 模板 + 少量 Lua filter / 预处理**

这是目前最稳的工程路线。不要从零手写 Markdown AST 到 DOCX，除非必须跑在浏览器里。

---

## 调研结论

Pandoc 是 GitHub 上最成熟的通用文档转换方案。它既是命令行工具，也是文档转换库，可以在多种标记语言和 Word `.docx` 之间转换。

Pandoc 的核心优势：

* 支持 Markdown 到 DOCX
* 支持 `reference.docx` 控制 Word 样式
* 支持 Lua filter 修改转换过程
* 支持目录、标题编号、脚注、表格、数学公式、代码高亮等复杂内容
* 适合服务端、CLI、自动化任务和 Agent 工程实现

我建议正式产品里不要直接复制第三方项目的模板或 Lua 文件，除非先确认许可证允许。更稳的做法是参考思路，自建 `reference.docx` 和自有 Lua filters。

---

## 推荐参考仓库

可以让 Codex 参考这些仓库：

```text
https://github.com/jgm/pandoc
https://github.com/Achuan-2/pandoc_docx_template
https://github.com/vace/markdown-docx
https://github.com/inokawa/remark-docx
https://github.com/md2docx/mdast2docx
https://github.com/wangqiqi/md2docx
```

---

## 方案对比

### 方案一：Pandoc

推荐作为默认方案。

优点：

* 最成熟稳定
* Word 输出质量最好
* 支持 `reference.docx`
* 支持复杂 Markdown 特性
* 适合工程化和批量转换
* 可通过 Lua filter 扩展

缺点：

* 依赖外部二进制程序 Pandoc
* 需要部署环境安装 Pandoc
* 浏览器环境无法直接使用

适用场景：

* 服务端转换
* CLI 工具
* 本地桌面应用
* 后端 API
* 自动化文档生成
* 对 Word 样式保真度要求高的场景

---

### 方案二：`vace/markdown-docx`

适合作为 fallback 方案。

优点：

* TypeScript / JavaScript 实现
* 支持 Node.js 和浏览器
* 不依赖 Pandoc
* 支持图片、表格、列表、代码块、链接、脚注、数学公式等

缺点：

* 无法完全复用 Word `reference.docx`
* 对复杂企业模板、页眉页脚、章节编号等支持不如 Pandoc
* Word 样式保真度有限

适用场景：

* 浏览器内直接导出 DOCX
* 无法安装 Pandoc 的环境
* 对 Word 样式要求不高的轻量导出场景

---

### 方案三：`remark-docx`

适合已经使用 unified / remark 生态的项目。

优点：

* 基于 remark / unified 生态
* 可插件化处理 Markdown AST
* 可运行在浏览器和 Node.js
* 可与现有 Markdown pipeline 集成

缺点：

* 默认样式成熟度不如 Pandoc
* 复杂 Word 样式需要自己维护
* 对企业模板支持有限

适用场景：

* 项目本身已经使用 unified / remark
* 希望自己控制 Markdown AST 到 DOCX 的映射
* 需要浏览器兼容

---

### 方案四：Python 方案

可以参考 `wangqiqi/md2docx` / `mddocx`。

优点：

* Python-only 项目更容易集成
* 可以用 `python-docx` 等库生成 DOCX
* 适合 Python 后端或脚本项目

缺点：

* 自己维护复杂 Markdown 到 DOCX 映射成本高
* Word 样式保真度通常不如 Pandoc
* 复杂数学公式、Mermaid、HTML 等能力容易不稳定

适用场景：

* 当前项目是纯 Python
* 转换需求比较简单
* 不方便安装 Pandoc，但可以接受功能限制

---

# 给 Codex 的实现说明

请实现一个“Markdown 转 Word DOCX”的功能。优先使用 Pandoc，不要从零手写完整 Markdown 到 DOCX 转换器。

## 一、技术选型

### 默认方案：Pandoc CLI wrapper

通过子进程调用 Pandoc。

要求：

* 使用 Word `reference.docx` 控制样式
* 使用 Lua filter 或预处理修正 Pandoc 默认转换不理想的地方
* 支持本地 Markdown 文件输入
* 支持 Markdown 字符串输入
* 支持输出 `.docx` 文件
* 支持中文排版
* 支持标题、正文、列表、表格、代码块、行内代码、引用、链接、图片、脚注、数学公式

中文排版相关内容交给 `reference.docx` 控制，例如：

* 宋体 / 微软雅黑 / 黑体
* 标题层级
* 列表缩进
* 表格样式
* 代码样式
* 页边距
* 页眉页脚
* 正文字号
* 段落间距

---

### fallback 方案：`vace/markdown-docx`

当无法使用 Pandoc 时，才启用 fallback。

fallback 适用条件：

* 用户显式设置 `engine=markdown-docx`
* 当前环境无法安装或调用 Pandoc
* 需求是浏览器内直接导出 DOCX

fallback 限制必须写进 README：

* 不能完全复用 Word `reference.docx`
* 复杂页眉页脚可能不一致
* 章节编号可能不一致
* 企业 Word 模板保真度不如 Pandoc
* 部分复杂 HTML、数学公式、图表能力可能不如 Pandoc

---

## 二、需要实现的接口

如果当前项目是 TypeScript / Node.js 项目，优先实现以下接口：

```ts
export interface ConvertMarkdownToDocxOptions {
  markdown?: string;
  inputPath?: string;
  outputPath: string;
  referenceDocPath?: string;
  resourcePaths?: string[];
  title?: string;
  author?: string;
  toc?: boolean;
  numberSections?: boolean;
  preserveHtml?: boolean;
  allowRemoteImages?: boolean;
  timeoutMs?: number;
  highlightStyle?: string;
}

export async function convertMarkdownToDocx(
  options: ConvertMarkdownToDocxOptions
): Promise<void>;
```

同时提供 CLI：

```bash
md2docx input.md -o output.docx
md2docx input.md -o output.docx --reference-doc assets/reference.docx
md2docx input.md -o output.docx --toc --number-sections
md2docx input.md -o output.docx --allow-remote-images
md2docx input.md -o output.docx --preserve-html
```

如果当前项目是 Python，则实现同等能力的 Python 函数和 CLI，不要强行引入 Node。

---

## 三、Pandoc 调用方式

### 1. 启动前检测

启动前执行：

```bash
pandoc --version
```

如果 Pandoc 不存在，抛出明确错误：

```text
Pandoc is required. Please install pandoc or enable fallback.
```

要求：

* 不要静默失败
* 错误信息必须清晰
* README 中要写清楚如何安装 Pandoc

---

### 2. 创建默认 `reference.docx`

如果仓库还没有 `assets/reference.docx`，提供脚本生成默认模板：

```bash
pandoc -o assets/reference.docx --print-default-data-file reference.docx
```

然后开发者可以在 Word 或 LibreOffice 中修改该模板的样式。

注意：

* 不要直接复制第三方仓库里的 `.docx` 或 `.lua` 文件
* 除非先确认许可证允许
* 更推荐自建模板和自有 Lua filters

---

### 3. 默认转换命令

注意使用 `spawn` / `execFile` 参数数组，不要拼 shell 字符串，避免命令注入。

默认 Pandoc 命令结构：

```bash
pandoc input.md \
  --from=gfm+tex_math_dollars+raw_html+yaml_metadata_block \
  --to=docx \
  --standalone \
  --output=output.docx \
  --reference-doc=assets/reference.docx \
  --resource-path=<input_dir>:<cwd>:<extra_resource_paths> \
  --highlight-style=<highlightStyle>
```

可选参数：

```bash
--toc
--number-sections
--metadata=title:<title>
--metadata=author:<author>
--lua-filter=filters/markdown-to-docx.lua
```

---

## 四、HTML 处理策略

Pandoc 对 raw HTML 输出到 DOCX 时，部分 HTML 会被忽略或转换不理想，所以不要默认依赖 raw HTML 直出 DOCX。

当 `preserveHtml=true` 时，可以使用两种策略。

### 策略 A：Lua filter 处理常见 HTML 标签

优先处理以下 HTML 标签：

* `sub`
* `sup`
* `span style="color:..."`
* `img`
* `u`
* `mark`
* `br`

### 策略 B：Markdown -> HTML -> DOCX 两段转换

如果 Lua filter 不足，再启用两段转换：

```bash
pandoc input.md -t html -o temp.html
pandoc temp.html -f html -t docx -o output.docx --reference-doc assets/reference.docx
```

注意：

* 两段 HTML 转换可能影响复杂数学公式
* 仅在用户明确设置 `preserveHtml=true` 或检测到 HTML 标签时启用
* README 中要说明 tradeoff

---

## 五、需要实现的预处理

### 1. Markdown 输入

支持两种输入方式：

* `markdown` 字符串
* `inputPath` 文件路径

要求：

* 如果传入 `markdown` 字符串，写入临时 `input.md`
* 如果传入 `inputPath`，直接读取该文件
* `outputPath` 必须以 `.docx` 结尾
* 如果 `outputPath` 不是 `.docx`，直接报错

---

### 2. 资源路径

默认 `resourcePaths` 包含：

* `input.md` 所在目录
* 当前工作目录
* 用户额外传入的 `resourcePaths`

需要支持：

* 相对路径图片
* 本地图片
* 多资源目录

---

### 3. 远程图片

默认禁止远程图片下载。

只有当 `allowRemoteImages=true` 时，才允许下载 `http` / `https` 图片到临时目录，并重写 Markdown。

安全限制：

* 禁止 `file://`
* 禁止 `ftp://`
* 禁止访问 `localhost`
* 禁止访问 `127.0.0.1`
* 禁止访问 `0.0.0.0`
* 禁止访问内网 IP
* 禁止访问 link-local IP
* 限制单图大小，例如 20MB
* 校验 `Content-Type` 必须是 `image/*`
* 设置下载超时

下载失败时：

* 给出可读错误
* 或者按配置忽略图片

---

### 4. Front matter

支持 YAML front matter：

```yaml
---
title: 文档标题
author: 作者
date: 2026-06-25
---
```

优先级：

```text
CLI 参数 > 函数 options > front matter > 默认值
```

---

## 六、Lua filter 计划

在 `filters/markdown-to-docx.lua` 中实现，或者拆分为多个 filter。

### 1. image-title-to-caption

目标：

把 Markdown 图片语法中的 title 或 alt 转成 Word 图片 caption。

示例：

```markdown
![图片说明](./image.png "图片标题")
```

规则：

* 如果 title 存在，用 title 作为图片 caption
* 如果 title 不存在，用 alt 作为图片 caption
* 给 caption 应用 Word 样式 `Figure` 或 `Caption`

---

### 2. preserve-font-color

处理这种 HTML：

```html
<span style="color:red">红色文字</span>
<span style="color:#ff0000">红色文字</span>
```

转换方式：

* 优先转成 docx 可识别的 custom-style
* 尽量避免复杂 raw openxml
* 如果必须使用 raw openxml，需要单独测试 Word 和 LibreOffice 兼容性

---

### 3. inline-code-style

目标：

* 行内代码使用 `Inline Code` 样式
* 代码块使用 `Source Code` 样式
* 不要让二者完全混用同一个 Word 样式

示例：

```markdown
这是 `inline code`。
```

```js
console.log("code block");
```

---

### 4. html-basic-tags

至少支持：

* `sub`
* `sup`
* `u`
* `mark`
* `br`

不支持的复杂 HTML：

* 保持纯文本
* 或给出 warning

---

## 七、fallback：`vace/markdown-docx`

当满足以下任一条件时，才使用 fallback：

* 用户显式设置 `engine=markdown-docx`
* 当前环境无法安装或调用 Pandoc
* 需求是浏览器内直接导出 DOCX

实现方式：

* 安装 `markdown-docx`
* 使用它的 `markdownDocx()`
* Node.js 中使用 `Packer.toBuffer()`
* 浏览器中使用 `Packer.toBlob()`
* 传入 theme 配置，模拟 `reference.docx` 的核心样式

README 中明确 fallback 限制：

* 不能完全复用 Word `reference.docx`
* 复杂页眉页脚不保证一致
* 复杂章节编号不保证一致
* 企业模板保真度不如 Pandoc
* 部分复杂 HTML / 数学公式 / 图表能力可能不如 Pandoc

---

## 八、测试要求

建立测试文件：

```text
tests/fixtures/complex.md
```

内容至少包含：

````markdown
# 一级标题

## 二级标题

中文段落、English text、**粗体**、*斜体*、`inline code`

> 引用块

- 无序列表
  - 二级列表

1. 有序列表
2. 第二项

| 名称 | 数值 |
| --- | ---: |
| A | 100 |

```js
console.log("hello");
```

[链接](https://example.com)

![本地图片](./sample.png "图片标题")

脚注[^1]

[^1]: 脚注内容

数学：$E=mc^2$

HTML:

H<sub>2</sub>O, x<sup>2</sup>, <span style="color:red">红色文字</span>
````

测试项：

1. Pandoc 不存在时，错误信息清晰。
2. 正常转换后 `output.docx` 存在且不是空文件。
3. 用 zip / XML 或 docx 解析库检查 docx 结构：

   * `word/document.xml` 存在
   * 包含关键文本：一级标题、中文段落、红色文字、脚注内容
   * 包含 table 结构
   * 包含 image relationship
   * 数学公式尽量检查是否有 OMML 节点，例如 `m:oMath`
4. 不做二进制 snapshot，因为 docx 中会有时间戳、关系 ID 等不稳定内容。
5. CI 中如果没有 Pandoc，则跳过集成测试，但保留单元测试。

---

## 九、验收标准

功能必须满足：

1. CLI 和函数 API 都可用。
2. 默认 Pandoc 转换能正确输出 DOCX。
3. `reference.docx` 可控制 Word 样式。
4. 支持中文内容。
5. 支持标题。
6. 支持列表。
7. 支持表格。
8. 支持代码块。
9. 支持行内代码。
10. 支持引用。
11. 支持链接。
12. 支持图片。
13. 支持脚注。
14. 支持数学公式。
15. HTML 标签至少支持：

    * `sub`
    * `sup`
    * `span color`
    * `u`
    * `br`
16. 复杂 HTML 有 warning。
17. 错误信息可读，至少包含：

    * Pandoc 缺失
    * 输入文件不存在
    * 图片找不到
    * 输出路径非法
    * 转换超时
18. 子进程调用不能使用 shell 拼接，避免命令注入。
19. README 写清楚：

    * 如何安装 Pandoc
    * 如何创建 `reference.docx`
    * 如何修改 `reference.docx`
    * CLI 用法
    * fallback 限制
    * 已知问题

---

## 最终建议

Codex 应该先实现 Pandoc wrapper 版本。

推荐优先级：

```text
1. Pandoc wrapper
2. reference.docx 样式模板
3. Lua filters
4. 图片和资源路径处理
5. HTML 兼容处理
6. fallback：vace/markdown-docx
```

不要优先从零实现 Markdown 到 OOXML 的完整转换器。

这样能最大化 Word 格式保真，同时避免在项目里维护一整套复杂的 Markdown -> OOXML 转换器。
