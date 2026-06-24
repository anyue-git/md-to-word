const form = document.querySelector("#convertForm");
const segments = document.querySelectorAll(".segment");
const panels = document.querySelectorAll("[data-mode-panel]");
const inputPath = document.querySelector("#inputPath");
const markdownFile = document.querySelector("#markdownFile");
const selectedFileName = document.querySelector("#selectedFileName");
const outputPath = document.querySelector("#outputPath");
const referenceDocPath = document.querySelector("#referenceDocPath");
const resourcePaths = document.querySelector("#resourcePaths");
const submitButton = document.querySelector("#submitButton");
const resultPanel = document.querySelector("#resultPanel");
const resultTitle = document.querySelector("#resultTitle");
const resultText = document.querySelector("#resultText");
const downloadLink = document.querySelector("#downloadLink");

let currentMode = "path";
let selectedMarkdown = "";

segments.forEach((segment) => {
  segment.addEventListener("click", () => {
    currentMode = segment.dataset.mode;
    segments.forEach((item) => item.classList.toggle("active", item === segment));
    panels.forEach((panel) => {
      panel.classList.toggle("hidden", panel.dataset.modePanel !== currentMode);
    });
    resetResult();
  });
});

markdownFile.addEventListener("change", async () => {
  const file = markdownFile.files?.[0];
  selectedMarkdown = file ? await file.text() : "";
  selectedFileName.textContent = file ? file.name : "纯文本 Markdown 最适合这种方式";
  if (file && !outputPath.value.trim()) {
    outputPath.placeholder = `${file.name.replace(/\.(md|markdown)$/i, "")}.docx`;
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  resetResult();

  const payload = buildPayload();
  const validationError = validatePayload(payload);
  if (validationError) {
    showResult("需要补充信息", validationError, "error");
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "转换中...";

  try {
    const response = await fetch("/api/convert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.error || "转换失败。");
    }

    showResult("转换完成", `已生成：${data.outputPath}`, "success", data.downloadUrl);
  } catch (error) {
    showResult("转换失败", error instanceof Error ? error.message : String(error), "error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "开始转换";
  }
});

function buildPayload() {
  return {
    mode: currentMode,
    inputPath: inputPath.value,
    markdown: selectedMarkdown,
    outputPath: outputPath.value,
    referenceDocPath: referenceDocPath.value,
    resourcePaths: resourcePaths.value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean),
    title: document.querySelector("#title").value,
    author: document.querySelector("#author").value,
    highlightStyle: document.querySelector("#highlightStyle").value,
    toc: document.querySelector("#toc").checked,
    numberSections: document.querySelector("#numberSections").checked,
    preserveHtml: document.querySelector("#preserveHtml").checked,
    allowRemoteImages: document.querySelector("#allowRemoteImages").checked
  };
}

function validatePayload(payload) {
  if (payload.mode === "path" && !payload.inputPath.trim()) {
    return "请填写 Markdown 文件路径。";
  }
  if (payload.mode === "content" && !payload.markdown.trim()) {
    return "请选择一个 Markdown 文件。";
  }
  if (payload.outputPath.trim() && !payload.outputPath.trim().toLowerCase().endsWith(".docx")) {
    return "输出路径需要以 .docx 结尾。";
  }
  return "";
}

function showResult(title, text, state, url) {
  resultPanel.hidden = false;
  resultPanel.classList.toggle("error", state === "error");
  resultTitle.textContent = title;
  resultText.textContent = text;

  if (url) {
    downloadLink.hidden = false;
    downloadLink.href = url;
  } else {
    downloadLink.hidden = true;
    downloadLink.href = "#";
  }
}

function resetResult() {
  resultPanel.hidden = true;
  resultPanel.classList.remove("error");
  downloadLink.hidden = true;
}
