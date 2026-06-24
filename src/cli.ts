#!/usr/bin/env node
import { convertMarkdownToDocx, MarkdownToDocxError } from "./index.js";

interface CliOptions {
  inputPath?: string;
  outputPath?: string;
  referenceDocPath?: string;
  resourcePaths: string[];
  title?: string;
  author?: string;
  toc: boolean;
  numberSections: boolean;
  preserveHtml: boolean;
  allowRemoteImages: boolean;
  timeoutMs?: number;
  highlightStyle?: string;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (!options.inputPath || !options.outputPath) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  await convertMarkdownToDocx({
    inputPath: options.inputPath,
    outputPath: options.outputPath,
    referenceDocPath: options.referenceDocPath,
    resourcePaths: options.resourcePaths,
    title: options.title,
    author: options.author,
    toc: options.toc,
    numberSections: options.numberSections,
    preserveHtml: options.preserveHtml,
    allowRemoteImages: options.allowRemoteImages,
    timeoutMs: options.timeoutMs,
    highlightStyle: options.highlightStyle
  });
}

function parseArgs(args: string[]): CliOptions {
  const parsed: CliOptions = {
    resourcePaths: [],
    toc: false,
    numberSections: false,
    preserveHtml: false,
    allowRemoteImages: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (!arg.startsWith("-") && !parsed.inputPath) {
      parsed.inputPath = arg;
      continue;
    }

    switch (arg) {
      case "-o":
      case "--output":
        parsed.outputPath = readValue(args, ++index, arg);
        break;
      case "--reference-doc":
        parsed.referenceDocPath = readValue(args, ++index, arg);
        break;
      case "--resource-path":
        parsed.resourcePaths.push(readValue(args, ++index, arg));
        break;
      case "--title":
        parsed.title = readValue(args, ++index, arg);
        break;
      case "--author":
        parsed.author = readValue(args, ++index, arg);
        break;
      case "--timeout-ms":
        parsed.timeoutMs = Number(readValue(args, ++index, arg));
        if (!Number.isFinite(parsed.timeoutMs) || parsed.timeoutMs <= 0) {
          throw new MarkdownToDocxError("--timeout-ms must be a positive number.");
        }
        break;
      case "--highlight-style":
        parsed.highlightStyle = readValue(args, ++index, arg);
        break;
      case "--toc":
        parsed.toc = true;
        break;
      case "--number-sections":
        parsed.numberSections = true;
        break;
      case "--preserve-html":
        parsed.preserveHtml = true;
        break;
      case "--allow-remote-images":
        parsed.allowRemoteImages = true;
        break;
      case "-h":
      case "--help":
        printUsage();
        process.exit(0);
      default:
        throw new MarkdownToDocxError(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}

function readValue(args: string[], index: number, flag: string): string {
  const value = args[index];
  if (!value || value.startsWith("-")) {
    throw new MarkdownToDocxError(`Missing value for ${flag}.`);
  }
  return value;
}

function printUsage(): void {
  console.log(`Usage:
  md2docx input.md -o output.docx
  md2docx input.md -o output.docx --reference-doc assets/reference.docx
  md2docx input.md -o output.docx --toc --number-sections
  md2docx input.md -o output.docx --allow-remote-images
  md2docx input.md -o output.docx --preserve-html`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
