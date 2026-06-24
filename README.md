# Markdown 转 Word 操作步骤

## 第一次使用

```bash
cd md-to-word
npm install
npm run build
```

如果没有 `assets/reference.docx`，再运行：

```bash
npm run generate:reference
```

## 每次转换

把下面命令里的输入文件和输出文件换成你自己的路径：

```bash
cd md-to-word
node dist/cli.js 输入文件.md -o 输出文件.docx --reference-doc assets/reference.docx
```

例子：

```bash
cd md-to-word
node dist/cli.js ~/Documents/input.md -o ~/Documents/output.docx --reference-doc assets/reference.docx
```

## 可视化界面

最方便的方式：双击项目里的这个文件：

```text
打开可视化界面.command
```

它会自动启动本地服务并打开浏览器。关闭可视化页面后，后台服务会自动停止。

如果页面已经开着，再次双击会直接打开已有界面。

也可以用命令启动：

运行：

```bash
cd md-to-word
npm run app:open
```

然后打开：

```text
http://127.0.0.1:5177
```

界面支持两种输入方式：

- 填写 Markdown 文件路径：适合有本地图片、相对资源路径的文档。
- 选择 Markdown 文件：适合纯文本 Markdown，生成后可直接下载 `.docx`。

输出路径可以留空，文件会自动保存到 `outputs/` 目录。

## 需要目录和标题编号时

```bash
cd md-to-word
node dist/cli.js ~/Documents/input.md -o ~/Documents/output.docx --reference-doc assets/reference.docx --toc --number-sections
```

## 需要设置标题和作者时

```bash
cd md-to-word
node dist/cli.js ~/Documents/input.md -o ~/Documents/output.docx --reference-doc assets/reference.docx --title "文档标题" --author "作者名"
```

## 修改 Word 样式

打开这个文件：

```text
assets/reference.docx
```

在 Word 里修改样式后保存。以后继续用 `--reference-doc assets/reference.docx` 转换即可。
