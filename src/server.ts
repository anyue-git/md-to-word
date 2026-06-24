import { execFile } from "node:child_process";
import { createReadStream } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { convertMarkdownToDocx, MarkdownToDocxError } from "./index.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(rootDir, "public");
const defaultOutputDir = path.join(rootDir, "outputs");
const host = "127.0.0.1";
const port = Number(process.env.PORT ?? 5177);
const appUrl = `http://${host}:${port}`;
const autoOpen = process.env.APP_AUTO_OPEN === "1";
const startedAt = Date.now();
let lastHeartbeatAt: number | undefined;
let shutdownTimer: NodeJS.Timeout | undefined;

interface ConvertRequest {
  mode?: "path" | "content";
  inputPath?: string;
  markdown?: string;
  outputPath?: string;
  referenceDocPath?: string;
  resourcePaths?: string[];
  title?: string;
  author?: string;
  toc?: boolean;
  numberSections?: boolean;
  preserveHtml?: boolean;
  allowRemoteImages?: boolean;
  highlightStyle?: string;
}

interface ConvertResponse {
  ok: true;
  outputPath: string;
  downloadUrl: string;
}

const server = createServer(async (request, response) => {
  try {
    if (request.method === "POST" && request.url === "/api/convert") {
      await handleConvert(request, response);
      return;
    }

    if (request.method === "POST" && request.url === "/api/session/heartbeat") {
      markBrowserActive();
      sendJson(response, 200, { ok: true });
      return;
    }

    if (request.method === "POST" && request.url === "/api/session/end") {
      scheduleShutdown("browser window closed", 2_500);
      sendJson(response, 200, { ok: true });
      return;
    }

    if (request.method === "GET" && request.url?.startsWith("/api/download")) {
      await handleDownload(request, response);
      return;
    }

    if (request.method === "GET") {
      await serveStatic(request, response);
      return;
    }

    sendJson(response, 405, { ok: false, error: "Method not allowed." });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    sendJson(response, 500, { ok: false, error: message });
  }
});

server.listen(port, host, () => {
  console.log(`Markdown to Word app running at ${appUrl}`);
  if (autoOpen) {
    openBrowser(appUrl);
  }
});

server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.log(`Markdown to Word app is already running at ${appUrl}`);
    if (autoOpen) {
      openBrowser(appUrl);
      process.exit(0);
    }
  }

  throw error;
});

setInterval(() => {
  if (!autoOpen) return;

  const now = Date.now();
  if (!lastHeartbeatAt && now - startedAt > 120_000) {
    scheduleShutdown("no browser session connected", 0);
    return;
  }

  if (lastHeartbeatAt && now - lastHeartbeatAt > 18_000) {
    scheduleShutdown("browser page inactive", 0);
  }
}, 5_000).unref();

async function handleConvert(
  request: IncomingMessage,
  response: ServerResponse
): Promise<void> {
  const body = await readJsonBody<ConvertRequest>(request);
  const outputPath = await resolveOutputPath(body);
  const referenceDocPath = body.referenceDocPath?.trim() || path.join(rootDir, "assets/reference.docx");
  const resourcePaths = parseResourcePaths(body.resourcePaths);

  await convertMarkdownToDocx({
    inputPath: body.mode === "path" ? body.inputPath?.trim() : undefined,
    markdown: body.mode === "content" ? body.markdown : undefined,
    outputPath,
    referenceDocPath,
    resourcePaths,
    title: cleanOptional(body.title),
    author: cleanOptional(body.author),
    toc: Boolean(body.toc),
    numberSections: Boolean(body.numberSections),
    preserveHtml: Boolean(body.preserveHtml),
    allowRemoteImages: Boolean(body.allowRemoteImages),
    highlightStyle: cleanOptional(body.highlightStyle)
  });

  const payload: ConvertResponse = {
    ok: true,
    outputPath,
    downloadUrl: `/api/download?path=${encodeURIComponent(outputPath)}`
  };
  sendJson(response, 200, payload);
}

async function handleDownload(
  request: IncomingMessage,
  response: ServerResponse
): Promise<void> {
  const requestUrl = new URL(request.url ?? "", `http://localhost:${port}`);
  const filePath = requestUrl.searchParams.get("path");

  if (!filePath || path.extname(filePath).toLowerCase() !== ".docx") {
    sendJson(response, 400, { ok: false, error: "A DOCX path is required." });
    return;
  }

  const resolvedPath = path.resolve(filePath);
  const file = await stat(resolvedPath);
  if (!file.isFile()) {
    sendJson(response, 404, { ok: false, error: "DOCX file not found." });
    return;
  }

  response.writeHead(200, {
    "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "Content-Length": String(file.size),
    "Content-Disposition": `attachment; filename="${encodeHeaderFilename(path.basename(resolvedPath))}"`
  });
  createReadStream(resolvedPath).pipe(response);
}

async function serveStatic(
  request: IncomingMessage,
  response: ServerResponse
): Promise<void> {
  const requestUrl = new URL(request.url ?? "/", `http://localhost:${port}`);
  const pathname = decodeURIComponent(requestUrl.pathname);
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.resolve(publicDir, `.${requestedPath}`);

  if (!filePath.startsWith(`${publicDir}${path.sep}`)) {
    sendJson(response, 403, { ok: false, error: "Forbidden." });
    return;
  }

  try {
    const file = await stat(filePath);
    if (!file.isFile()) throw new Error("not a file");

    response.writeHead(200, {
      "Content-Type": getContentType(filePath),
      "Content-Length": String(file.size)
    });
    createReadStream(filePath).pipe(response);
  } catch {
    sendJson(response, 404, { ok: false, error: "Not found." });
  }
}

async function resolveOutputPath(body: ConvertRequest): Promise<string> {
  const explicitPath = body.outputPath?.trim();
  if (explicitPath) {
    const resolved = path.resolve(explicitPath);
    if (path.extname(resolved).toLowerCase() !== ".docx") {
      throw new MarkdownToDocxError("Output path must end with .docx.");
    }
    return resolved;
  }

  await mkdir(defaultOutputDir, { recursive: true });
  const baseName =
    body.mode === "path" && body.inputPath
      ? path.basename(body.inputPath, path.extname(body.inputPath))
      : "converted";
  const safeName = baseName.replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/^-+|-+$/g, "");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(defaultOutputDir, `${safeName || "converted"}-${timestamp}.docx`);
}

async function readJsonBody<T>(request: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {} as T;
  return JSON.parse(raw) as T;
}

function parseResourcePaths(paths?: string[]): string[] {
  return (paths ?? [])
    .flatMap((item) => item.split("\n"))
    .map((item) => item.trim())
    .filter(Boolean);
}

function cleanOptional(value?: string): string | undefined {
  const cleaned = value?.trim();
  return cleaned ? cleaned : undefined;
}

function sendJson(response: ServerResponse, status: number, payload: unknown): void {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
  });
  response.end(body);
}

function getContentType(filePath: string): string {
  switch (path.extname(filePath).toLowerCase()) {
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".html":
      return "text/html; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

function encodeHeaderFilename(filename: string): string {
  return filename.replace(/["\\]/g, "_");
}

function markBrowserActive(): void {
  lastHeartbeatAt = Date.now();
  if (shutdownTimer) {
    clearTimeout(shutdownTimer);
    shutdownTimer = undefined;
  }
}

function scheduleShutdown(reason: string, delayMs: number): void {
  if (shutdownTimer) return;

  shutdownTimer = setTimeout(() => {
    console.log(`Stopping Markdown to Word app: ${reason}.`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1_000).unref();
  }, delayMs);
  shutdownTimer.unref();
}

function openBrowser(url: string): void {
  execFile("open", [url], (error) => {
    if (error) {
      console.log(`Open this URL in your browser: ${url}`);
    }
  });
}
