import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "tmp");
const outputPath = path.join(outputDir, "test-complex.docx");

describe("md2docx CLI", () => {
  it("converts complex markdown to a non-empty docx", () => {
    mkdirSync(outputDir, { recursive: true });
    rmSync(outputPath, { force: true });

    execFileSync("node", [
      path.join(root, "dist/cli.js"),
      path.join(root, "tests/fixtures/complex.md"),
      "-o",
      outputPath,
      "--reference-doc",
      path.join(root, "assets/reference.docx"),
      "--toc",
      "--number-sections",
      "--preserve-html"
    ]);

    assert.equal(existsSync(outputPath), true);
    const size = readFileSync(outputPath).byteLength;
    assert.ok(size > 0);

    const listing = execFileSync("unzip", ["-l", outputPath], {
      encoding: "utf8"
    });
    assert.match(listing, /word\/document\.xml/);
    assert.match(listing, /word\/media\//);
  });
});
