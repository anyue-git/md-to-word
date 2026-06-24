import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

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

export class MarkdownToDocxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MarkdownToDocxError";
  }
}

export async function assertPandocAvailable(): Promise<void> {
  try {
    await execFileAsync("pandoc", ["--version"], { timeout: 5_000 });
  } catch {
    throw new MarkdownToDocxError(
      "Pandoc is required. Please install pandoc or enable fallback."
    );
  }
}

export async function convertMarkdownToDocx(
  options: ConvertMarkdownToDocxOptions
): Promise<void> {
  validateOptions(options);
  await assertPandocAvailable();

  const tempDir = await mkdtemp(path.join(tmpdir(), "md2docx-"));

  try {
    const inputPath = await resolveInputPath(options, tempDir);
    const outputPath = path.resolve(options.outputPath);
    await mkdir(path.dirname(outputPath), { recursive: true });

    const markdownForRemoteCheck =
      options.markdown ??
      (!options.allowRemoteImages ? await readFile(inputPath, "utf8") : undefined);
    if (
      !options.allowRemoteImages &&
      markdownForRemoteCheck &&
      hasRemoteImage(markdownForRemoteCheck)
    ) {
      throw new MarkdownToDocxError(
        "Remote images are disabled by default. Pass --allow-remote-images to keep http/https image references."
      );
    }

    const resourcePaths = uniquePaths([
      path.dirname(inputPath),
      process.cwd(),
      ...(options.resourcePaths ?? [])
    ]).join(path.delimiter);

    const args = [
      inputPath,
      "--from=gfm+tex_math_dollars+raw_html+yaml_metadata_block",
      "--to=docx",
      "--standalone",
      `--output=${outputPath}`,
      `--resource-path=${resourcePaths}`,
      `--highlight-style=${options.highlightStyle ?? "tango"}`
    ];

    if (options.referenceDocPath) {
      await assertFileExists(options.referenceDocPath, "Reference docx not found");
      args.push(`--reference-doc=${path.resolve(options.referenceDocPath)}`);
    }

    if (options.toc) args.push("--toc");
    if (options.numberSections) args.push("--number-sections");
    if (options.title) args.push(`--metadata=title:${options.title}`);
    if (options.author) args.push(`--metadata=author:${options.author}`);
    if (options.preserveHtml) {
      args.push(`--lua-filter=${path.resolve("filters/markdown-to-docx.lua")}`);
    }

    try {
      await execFileAsync("pandoc", args, {
        timeout: options.timeoutMs ?? 30_000,
        maxBuffer: 1024 * 1024 * 10
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("timed out")) {
        throw new MarkdownToDocxError("Markdown to DOCX conversion timed out.");
      }
      throw new MarkdownToDocxError(`Pandoc conversion failed: ${message}`);
    }

    const output = await stat(outputPath);
    if (output.size === 0) {
      throw new MarkdownToDocxError("Pandoc produced an empty DOCX file.");
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

function validateOptions(options: ConvertMarkdownToDocxOptions): void {
  if (!options.outputPath) {
    throw new MarkdownToDocxError("outputPath is required.");
  }
  if (path.extname(options.outputPath).toLowerCase() !== ".docx") {
    throw new MarkdownToDocxError("Output path must end with .docx.");
  }
  if (!options.markdown && !options.inputPath) {
    throw new MarkdownToDocxError("Either markdown or inputPath is required.");
  }
  if (options.markdown && options.inputPath) {
    throw new MarkdownToDocxError("Pass either markdown or inputPath, not both.");
  }
}

async function resolveInputPath(
  options: ConvertMarkdownToDocxOptions,
  tempDir: string
): Promise<string> {
  if (options.markdown) {
    const tempInput = path.join(tempDir, "input.md");
    await writeFile(tempInput, options.markdown, "utf8");
    return tempInput;
  }

  const inputPath = path.resolve(options.inputPath as string);
  await assertFileExists(inputPath, "Input Markdown file not found");
  return inputPath;
}

async function assertFileExists(filePath: string, label: string): Promise<void> {
  try {
    const file = await stat(path.resolve(filePath));
    if (!file.isFile()) throw new Error("not a file");
  } catch {
    throw new MarkdownToDocxError(`${label}: ${filePath}`);
  }
}

function uniquePaths(paths: string[]): string[] {
  return Array.from(new Set(paths.filter(Boolean).map((item) => path.resolve(item))));
}

function hasRemoteImage(markdown: string): boolean {
  return /!\[[^\]]*]\(\s*https?:\/\//i.test(markdown);
}
