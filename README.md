# Markdown 转 Word

一个本地 Markdown 转 Word `.docx` 工具，基于 Pandoc，支持可视化界面、命令行转换和 Word 样式模板。

## 功能

- 将 Markdown 转换为 Word `.docx`
- 支持目录、标题编号、标题、作者和代码高亮
- 支持使用 `assets/reference.docx` 控制 Word 样式
- 支持本地图片、表格、脚注、数学公式、代码块等 Markdown 内容
- 提供本地可视化界面，适合日常点击使用

## 环境要求

使用前需要安装：

- Node.js
- Pandoc

核心转换功能支持 macOS、Windows 和 Linux。

`打开可视化界面.command` 是 macOS 专用的双击启动文件。Windows 和 Linux 用户可以使用命令行启动可视化界面。

## 第一次使用

进入项目目录后安装依赖：

```bash
npm install
```

如果缺少 Word 样式模板，可以生成默认模板：

```bash
npm run generate:reference
```

## 可视化界面

### macOS 双击启动

在 Finder 中双击：

```text
打开可视化界面.command
```

它会自动安装缺失依赖、启动本地服务并打开浏览器。

### 所有系统都可以使用：

命令行启动

```bash
npm run app
```

macOS 也可以用下面命令启动并自动打开浏览器：

```bash
npm run app:open
```

启动后打开：

```text
http://127.0.0.1:5177
```

界面右上角有“退出应用”按钮，点击后会停止后台服务。直接关闭浏览器页面也会自动停止服务；如果终端窗口提示是否终止进程，选择“终止”即可。

界面支持两种输入方式：

- 填写 Markdown 文件路径：适合有本地图片、相对资源路径的文档。
- 选择 Markdown 文件：适合纯文本 Markdown，生成后可直接下载 `.docx`。

输出路径可以留空，文件会自动保存到 `outputs/` 目录。

## 命令行转换

基础用法：

```bash
npm run build
node dist/cli.js 输入文件.md -o 输出文件.docx --reference-doc assets/reference.docx
```

例子：

```bash
npm run build
node dist/cli.js ~/Documents/input.md -o ~/Documents/output.docx --reference-doc assets/reference.docx
```

生成目录和标题编号：

```bash
node dist/cli.js ~/Documents/input.md -o ~/Documents/output.docx --reference-doc assets/reference.docx --toc --number-sections
```

设置标题和作者：

```bash
node dist/cli.js ~/Documents/input.md -o ~/Documents/output.docx --reference-doc assets/reference.docx --title "文档标题" --author "作者名"
```

## 修改 Word 样式

打开这个文件：

```text
assets/reference.docx
```

在 Word 里修改样式后保存。以后继续使用 `--reference-doc assets/reference.docx` 转换即可。

## 临时文件

以下目录是本地生成内容，不会提交到 Git：

- `node_modules/`
- `dist/`
- `tmp/`
- `outputs/`
