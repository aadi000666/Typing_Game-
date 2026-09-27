import { snippets } from "./snippets.js";
import { AudioEngine } from "./audio.js";
import { createBackground } from "./background.js";

const DATA_KEY = "cybertype.profile.v1";
const MAX_HISTORY = 50;
const KEYS = "1234567890qwertyuiopasdfghjklzxcvbnm,.;'/-=[]\\`".split("");
const dom = Object.fromEntries([
  "ambient", "audio-toggle", "personal-best", "session-count", "language-select", "language-wrap", "new-prompt",
  "prompt-label", "text-stage", "prompt-text", "typing-input", "prompt-status", "file-input", "choose-file", "drop-zone",
  "drop-hint", "wpm-value", "ghost-delta", "accuracy-value", "error-value", "progress-value", "progress-bar", "start-button",
  "history-total", "history-list", "key-heatmap", "summary-dialog", "summary-title", "summary-subtitle", "summary-wpm",
  "summary-accuracy", "summary-time", "summary-chart", "close-summary", "summary-close-action", "replay-button"
].map(id => [id.replace(/-([a-z])/g, (_, char) => char.toUpperCase()), document.getElementById(id)]));

const background = createBackground(dom.ambient);
const audio = new AudioEngine(dom.audioToggle);
let profile = loadProfile();
let mode = "standard";
let language = "javascript";
let prompt = snippets.standard[0];
let promptIndex = 0;
let running = false;
let finished = false;
let startedAt = 0;
let animationFrame = 0;
let charTimes = [];
let keyRun = {};
let bestRun = null;
let lastResult = null;
let renderedText = null;
let renderedTyped = null;
let renderedGhostIndex = -2;
let renderedFinished = false;

function loadProfile() {
  try {
    const parsed = JSON.parse(localStorage.getItem(DATA_KEY) || "{}");
    return { history: Array.isArray(parsed.history) ? parsed.history : [], keys: parsed.keys || {}, best: parsed.best || {} };
  } catch {
    return { history: [], keys: {}, best: {} };
  }
}

function persist() {
  try { localStorage.setItem(DATA_KEY, JSON.stringify(profile)); }
  catch { dom.promptStatus.textContent = "LOCAL STORAGE FULL: SESSION NOT SAVED"; }
}

function promptKey() { return mode === "custom" ? `custom:${hashText(prompt.text)}` : `${mode}:${mode === "code" ? language : "standard"}:${prompt.title}`; }

function hashText(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function choosePrompt(next = false) {
  if (mode === "custom") return;
  const collection = mode === "standard" ? snippets.standard : snippets[language];
  if (next && collection.length > 1) promptIndex = (promptIndex + 1 + Math.floor(Math.random() * (collection.length - 1))) % collection.length;
  else if (!next) promptIndex = Math.floor(Math.random() * collection.length);
  prompt = collection[promptIndex];
  bestRun = profile.best[promptKey()] || null;
  dom.promptLabel.textContent = prompt.title.toUpperCase();
}

function resetRun() {
  running = false;
  finished = false;
  startedAt = 0;
  charTimes = [];
  keyRun = {};
  lastResult = null;
  cancelAnimationFrame(animationFrame);
  dom.typingInput.value = "";
  dom.typingInput.maxLength = prompt.text.length;
  dom.startButton.disabled = false;
  dom.startButton.querySelector("span").textContent = "START RUN";
  dom.promptStatus.textContent = "CLICK HERE OR START TYPING";
  dom.textStage.setAttribute("aria-label", `Typing practice: ${prompt.title}`);
  drawPrompt();
  updateStats();
  if (newPrompt) dom.typingInput.focus();
}

function drawPrompt() {
  const typed = dom.typingInput.value;
  const elapsed = running ? performance.now() - startedAt : 0;
  let low = 0;
  let high = bestRun?.times?.length || 0;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (bestRun.times[middle] <= elapsed) low = middle + 1;
    else high = middle;
  }
  const ghostIndex = bestRun?.times ? low : -1;
  if (renderedText === prompt.text && renderedTyped === typed && renderedGhostIndex === ghostIndex && renderedFinished === finished) return;
  let output = "";
  for (let index = 0; index <= prompt.text.length; index += 1) {
    if (index === ghostIndex && running && bestRun?.times) output += '<i class="ghost-marker" aria-hidden="true"></i>';
    if (index === typed.length && !finished) output += '<i class="char current" aria-hidden="true"></i>';
    if (index === prompt.text.length) break;
    const expected = prompt.text[index];
    let state = "pending";
    if (index < typed.length) state = typed[index] === expected ? "correct" : "incorrect";
    output += `<span class="char ${state}">${escapeHtml(expected)}</span>`;
  }
  dom.promptText.innerHTML = output;
  renderedText = prompt.text;
  renderedTyped = typed;
  renderedGhostIndex = ghostIndex;
  renderedFinished = finished;
}

function escapeHtml(character) {
  return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] || (character === "\n" ? "<br>" : character === " " ? "&nbsp;" : character === "\t" ? "&nbsp;&nbsp;&nbsp;&nbsp;" : character);
}

function currentStats() {
  const typed = dom.typingInput.value;
  let correct = 0;
  let errors = 0;
  for (let index = 0; index < typed.length; index += 1) {
    if (typed[index] === prompt.text[index]) correct += 1;
    else errors += 1;
  }
  const elapsed = running ? performance.now() - startedAt : (lastResult?.elapsed || 0);
  const minutes = elapsed / 60000;
  const wpm = minutes > 0 ? Math.round((correct / 5) / minutes) : 0;
  const accuracy = typed.length ? Math.round(correct / typed.length * 100) : 100;
  const progress = prompt.text.length ? Math.round(typed.length / prompt.text.length * 100) : 0;
  return { typed, correct, errors, elapsed, wpm, accuracy, progress };
}

function updateStats() {
  const stats = currentStats();
  dom.wpmValue.textContent = String(stats.wpm);
  dom.accuracyValue.innerHTML = `${stats.accuracy}<span>%</span>`;
  dom.errorValue.textContent = `${stats.errors} ${stats.errors === 1 ? "ERROR" : "ERRORS"}`;
  dom.progressValue.innerHTML = `${stats.progress}<span>%</span>`;
  dom.progressBar.style.width = `${stats.progress}%`;
  const bestWpm = bestRun?.wpm || 0;
  dom.ghostDelta.textContent = bestWpm ? `BEST ${bestWpm}` : "BEST 0";
  background.setSpeed(stats.wpm);
}

function animate() {
  if (!running) return;
  updateStats();
  drawPrompt();
  animationFrame = requestAnimationFrame(animate);
}

function begin() {
  if (finished || mode === "custom" && !prompt.text) return;
  dom.typingInput.focus();
  if (!running) {
    running = true;
    startedAt = performance.now();
    dom.startButton.querySelector("span").textContent = "RUNNING";
    dom.startButton.disabled = true;
    dom.promptStatus.textContent = "IN THE ZONE // KEEP GOING";
    animationFrame = requestAnimationFrame(animate);
  }
}

function onInput() {
  if (finished) return;
  const value = dom.typingInput.value.slice(0, prompt.text.length);
  if (value !== dom.typingInput.value) dom.typingInput.value = value;
  if (value.length && !running) begin();
  const previousLength = charTimes.length;
  if (running) {
    while (charTimes.length < value.length) charTimes.push(performance.now() - startedAt);
    if (value.length < previousLength) charTimes.length = value.length;
  }
  for (const [key, record] of Object.entries(keyRun)) {
    if (record.lastIndex >= value.length) delete keyRun[key];
  }
  for (let index = 0; index < value.length; index += 1) {
    const key = normalizeKey(value[index]);
    const record = keyRun[key] || (keyRun[key] = { total: 0, errors: 0, lastIndex: -1 });
    if (record.lastIndex < index) {
      record.total += 1;
      if (value[index] !== prompt.text[index]) record.errors += 1;
      record.lastIndex = index;
    }
  }
  updateStats();
  drawPrompt();
  audio.click();
  if (value.length && value[value.length - 1] !== prompt.text[value.length - 1]) audio.miss();
  if (value.length === prompt.text.length) completeRun();
}

function normalizeKey(key) { return key === " " ? "SPACE" : key === "\n" ? "ENTER" : key === "\t" ? "TAB" : key.toLowerCase(); }

function completeRun() {
  running = false;
  finished = true;
  cancelAnimationFrame(animationFrame);
  const stats = currentStats();
  stats.elapsed = Math.max(1, performance.now() - startedAt);
  stats.wpm = Math.round((stats.correct / 5) / (stats.elapsed / 60000));
  lastResult = { ...stats, keyRun: structuredClone(keyRun) };
  const key = promptKey();
  const oldBest = profile.best[key];
  const wonBest = !oldBest || stats.wpm > oldBest.wpm || (stats.wpm === oldBest.wpm && stats.accuracy > oldBest.accuracy);
  if (wonBest) {
    profile.best[key] = { wpm: stats.wpm, accuracy: stats.accuracy, times: [...charTimes], text: prompt.text };
    bestRun = profile.best[key];
  }
  for (const [pressedKey, record] of Object.entries(keyRun)) {
    const stored = profile.keys[pressedKey] || { total: 0, errors: 0 };
    stored.total += record.total;
    stored.errors += record.errors;
    profile.keys[pressedKey] = stored;
  }
  profile.history.unshift({ wpm: stats.wpm, accuracy: stats.accuracy, errors: stats.errors, mode, language, title: prompt.title, date: Date.now(), elapsed: stats.elapsed });
  profile.history.length = Math.min(profile.history.length, MAX_HISTORY);
  persist();
  audio.complete();
  dom.promptStatus.textContent = wonBest ? "NEW PERSONAL BEST // RUN COMPLETE" : "RUN COMPLETE // NICE WORK";
  dom.startButton.disabled = false;
  dom.startButton.querySelector("span").textContent = "RUN AGAIN";
  updateStats();
  renderDashboard();
  showSummary(stats, wonBest);
}

function showSummary(stats, wonBest) {
  dom.summaryTitle.textContent = wonBest ? "New personal best." : "Nice run.";
  dom.summarySubtitle.textContent = `${prompt.title} · ${stats.errors} ${stats.errors === 1 ? "mistake" : "mistakes"}${wonBest ? " · Ghost updated" : ""}`;
  dom.summaryWpm.textContent = String(stats.wpm);
  dom.summaryAccuracy.textContent = `${stats.accuracy}%`;
  const seconds = Math.floor(stats.elapsed / 1000);
  dom.summaryTime.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  const typed = stats.typed;
  const bucketSize = Math.max(1, Math.ceil(typed.length / 64));
  const buckets = [];
  for (let start = 0; start < typed.length; start += bucketSize) {
    const end = Math.min(typed.length, start + bucketSize);
    let correct = 0;
    for (let index = start; index < end; index += 1) if (typed[index] === prompt.text[index]) correct += 1;
    const rate = Math.round(correct / (end - start) * 100);
    buckets.push(`<i class="chart-bar${rate < 80 ? " miss" : ""}" style="height:${Math.max(8, rate)}%" title="${rate}% accurate"></i>`);
  }
  dom.summaryChart.innerHTML = buckets.join("");
  if (!dom.summaryDialog.open) dom.summaryDialog.showModal();
}

function renderDashboard() {
  const allTimeBest = Math.max(0, ...Object.values(profile.best).map(run => run.wpm || 0));
  dom.personalBest.textContent = allTimeBest ? String(allTimeBest) : "--";
  dom.sessionCount.textContent = String(profile.history.length);
  dom.historyTotal.textContent = `LAST ${Math.min(7, profile.history.length)}`;
  dom.historyList.innerHTML = profile.history.length ? profile.history.slice(0, 7).map(run => {
    const label = run.mode === "standard" ? "Standard" : run.mode === "custom" ? "Your file" : `${run.language} lab`;
    return `<div class="history-item"><span class="history-mode">${escapeHtml(label)} / ${escapeHtml(run.title)}</span><strong>${run.wpm} <small>WPM</small></strong><small>${run.accuracy}%</small></div>`;
  }).join("") : '<p class="empty-state">Your first run is one keystroke away.</p>';
  dom.keyHeatmap.innerHTML = KEYS.map(key => {
    const item = profile.keys[key];
    const rate = item?.total ? item.errors / item.total : 0;
    const state = !item ? "" : rate > .15 ? " missed" : " good";
    return `<span class="heat-key${state}" title="${key}: ${item ? Math.round((1 - rate) * 100) + "% accuracy" : "No data yet"}">${escapeHtml(key)}</span>`;
  }).join("");
}

function setMode(nextMode) {
  mode = nextMode;
  document.querySelectorAll(".mode-tab").forEach(button => {
    const active = button.dataset.mode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  dom.languageWrap.hidden = mode !== "code";
  if (mode !== "custom") choosePrompt();
  else {
    prompt = { title: "Drop a file to begin", text: "" };
    dom.promptLabel.textContent = "CUSTOM FILE / LOCAL ONLY";
    bestRun = null;
  }
  document.querySelector(".practice-area").classList.toggle("custom-empty", mode === "custom" && !prompt.text);
  resetRun();
}

function setLanguage(value) {
  language = value;
  if (mode === "code") {
    choosePrompt();
    resetRun();
  }
}

async function loadFile(file) {
  if (!file) return;
  if (file.size > 512 * 1024) {
    dom.promptStatus.textContent = "FILE TOO LARGE // MAXIMUM 512 KB";
    return;
  }
  const content = await file.text();
  if (!content.trim()) {
    dom.promptStatus.textContent = "FILE IS EMPTY // CHOOSE ANOTHER";
    return;
  }
  mode = "custom";
  document.querySelectorAll(".mode-tab").forEach(button => {
    const active = button.dataset.mode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  dom.languageWrap.hidden = true;
  prompt = { title: file.name, text: content.replace(/\r\n?/g, "\n").slice(0, 8000) };
  bestRun = profile.best[promptKey()] || null;
  dom.promptLabel.textContent = `LOCAL FILE / ${file.name}`.toUpperCase();
  document.querySelector(".practice-area").classList.remove("custom-empty");
  resetRun();
  dom.promptStatus.textContent = content.length > 8000 ? "FILE TRIMMED TO 8,000 CHARACTERS" : "FILE READY // LOCAL ONLY";
  dom.typingInput.focus();
}

document.querySelectorAll(".mode-tab").forEach(button => button.addEventListener("click", () => setMode(button.dataset.mode)));
dom.languageSelect.addEventListener("change", event => setLanguage(event.target.value));
dom.typingInput.addEventListener("input", onInput);
dom.textStage.addEventListener("click", () => dom.typingInput.focus());
dom.startButton.addEventListener("click", () => finished ? resetRun() : begin());
dom.newPrompt.addEventListener("click", () => { if (mode !== "custom") { choosePrompt(true); resetRun(); } else dom.fileInput.click(); });
dom.fileInput.addEventListener("change", event => loadFile(event.target.files[0]));
dom.chooseFile.addEventListener("click", () => dom.fileInput.click());
dom.textStage.addEventListener("keydown", event => {
  if (event.key === "Escape") { event.preventDefault(); resetRun(); }
  if (event.key === "Tab") {
    event.preventDefault();
    const input = dom.typingInput;
    input.setRangeText("\t", input.selectionStart, input.selectionEnd, "end");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }
});
dom.typingInput.addEventListener("paste", event => event.preventDefault());
dom.dropZone.addEventListener("dragover", event => { event.preventDefault(); dom.dropZone.classList.add("dragging"); });
dom.dropZone.addEventListener("dragleave", event => { if (!dom.dropZone.contains(event.relatedTarget)) dom.dropZone.classList.remove("dragging"); });
dom.dropZone.addEventListener("drop", event => {
  event.preventDefault();
  dom.dropZone.classList.remove("dragging");
  loadFile(event.dataTransfer.files[0]);
});
dom.closeSummary.addEventListener("click", () => dom.summaryDialog.close());
dom.summaryCloseAction.addEventListener("click", () => dom.summaryDialog.close());
dom.replayButton.addEventListener("click", () => { dom.summaryDialog.close(); resetRun(); });
dom.summaryDialog.addEventListener("click", event => { if (event.target === dom.summaryDialog) dom.summaryDialog.close(); });

choosePrompt();
renderDashboard();
resetRun();