/* obsidian-tableplus */
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => TablePlusPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");

// src/layout.ts
var sum = (values) => values.reduce((total, value) => total + value, 0);
function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}
function reconcileByKeys(previousKeys, previousValues, currentKeys, fallbackValues, minimum) {
  const available = /* @__PURE__ */ new Map();
  previousKeys.forEach((key, index) => {
    var _a;
    const queue = (_a = available.get(key)) != null ? _a : [];
    queue.push(index);
    available.set(key, queue);
  });
  const matchedPrevious = currentKeys.map((key) => {
    const queue = available.get(key);
    return queue == null ? void 0 : queue.shift();
  });
  const consumed = new Set(
    matchedPrevious.filter((index) => index !== void 0)
  );
  const unmatchedPrevious = previousKeys.map((_, index) => index).filter((index) => !consumed.has(index));
  const unmatchedCurrent = matchedPrevious.map((previousIndex, index) => previousIndex === void 0 ? index : -1).filter((index) => index >= 0);
  const positionalPairs = Math.min(unmatchedPrevious.length, unmatchedCurrent.length);
  for (let index = 0; index < positionalPairs; index += 1) {
    const previousIndex = unmatchedPrevious[index];
    const currentIndex = unmatchedCurrent[index];
    matchedPrevious[currentIndex] = previousIndex;
    consumed.add(previousIndex);
  }
  const insertedIndices = [];
  const values = matchedPrevious.map((previousIndex, index) => {
    var _a, _b;
    if (previousIndex !== void 0) {
      return Math.max(minimum, (_a = previousValues[previousIndex]) != null ? _a : minimum);
    }
    insertedIndices.push(index);
    return Math.max(minimum, (_b = fallbackValues[index]) != null ? _b : minimum);
  });
  const removedKeys = previousKeys.filter((_, index) => !consumed.has(index));
  return { values, insertedIndices, removedKeys };
}
function shrinkWidths(input, amount, indices, minimum) {
  const widths = input.map((width) => Math.max(minimum, width));
  let remaining = Math.max(0, amount);
  const uniqueIndices = [...new Set(indices)].filter(
    (index) => index >= 0 && index < widths.length
  );
  for (let pass = 0; pass < widths.length && remaining > 0.01; pass += 1) {
    const adjustable = uniqueIndices.filter(
      (index) => widths[index] > minimum + 0.01
    );
    const capacity = sum(adjustable.map((index) => widths[index] - minimum));
    if (capacity <= 0.01) break;
    const take = Math.min(remaining, capacity);
    adjustable.forEach((index) => {
      const spare = widths[index] - minimum;
      const share = spare / capacity * take;
      widths[index] = Math.max(minimum, widths[index] - share);
    });
    remaining -= take;
  }
  return { widths, overflow: Math.max(0, remaining) };
}
function makeRoomForInsertedColumns(input, insertedIndices, containerWidth, minimum) {
  let widths = input.map((width) => Math.max(minimum, width));
  let excess = Math.max(0, sum(widths) - containerWidth);
  const inserted = new Set(insertedIndices);
  const existingIndices = widths.map((_, index) => index).filter((index) => !inserted.has(index));
  let result = shrinkWidths(widths, excess, existingIndices, minimum);
  widths = result.widths;
  excess = result.overflow;
  if (excess > 0.01) {
    result = shrinkWidths(widths, excess, insertedIndices, minimum);
    widths = result.widths;
    excess = result.overflow;
  }
  return { widths, overflow: excess };
}
function fitWidths(input, containerWidth, minimum) {
  const excess = Math.max(0, sum(input) - containerWidth);
  const allIndices = input.map((_, index) => index);
  return shrinkWidths(input, excess, allIndices, minimum);
}
function resizeColumn(input, columnIndex, delta, containerWidth, minimum) {
  const widths = input.map((width) => Math.max(minimum, width));
  if (columnIndex < 0 || columnIndex >= widths.length || delta === 0) {
    return { widths, overflow: Math.max(0, sum(widths) - containerWidth) };
  }
  widths[columnIndex] = Math.max(minimum, widths[columnIndex] + delta);
  return { widths, overflow: Math.max(0, sum(widths) - containerWidth) };
}

// main.ts
var DEFAULT_SETTINGS = {
  minimumColumnWidth: 48,
  defaultNewColumnWidth: 120,
  minimumRowHeight: 28,
  borderHitArea: 6,
  handleColor: "#4f9cff",
  enableLivePreview: true,
  enableReadingView: true
};
var DEFAULT_DATA = {
  version: 1,
  settings: DEFAULT_SETTINGS,
  layouts: {}
};
var DATA_LAYOUT_ID = "tableplusLayoutId";
function normalizeText(value) {
  return value.replace(/\u200b/g, "").replace(/\s+/g, " ").trim().toLocaleLowerCase();
}
function makeUniqueKeys(bases, prefix) {
  const occurrences = /* @__PURE__ */ new Map();
  return bases.map((rawBase) => {
    var _a;
    const base = rawBase || "blank";
    const next = ((_a = occurrences.get(base)) != null ? _a : 0) + 1;
    occurrences.set(base, next);
    return `${prefix}:${base}#${next}`;
  });
}
function overlapRatio(left, right) {
  if (left.length === 0 || right.length === 0) return 0;
  const rightSet = new Set(right);
  const matches = left.filter((value) => rightSet.has(value)).length;
  return matches / Math.max(left.length, right.length);
}
function arraysEqual(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
function roundDimensions(values) {
  return values.map((value) => Math.round(value * 10) / 10);
}
function getColumnCount(row) {
  return Array.from(row.cells).reduce(
    (count, cell) => count + Math.max(1, cell.colSpan),
    0
  );
}
function getCellAtColumn(row, columnIndex) {
  let cursor = 0;
  for (const cell of Array.from(row.cells)) {
    const end = cursor + Math.max(1, cell.colSpan);
    if (columnIndex >= cursor && columnIndex < end) return cell;
    cursor = end;
  }
  return null;
}
function getCellStartColumn(cell) {
  let column = 0;
  let sibling = cell.previousElementSibling;
  while (sibling instanceof HTMLTableCellElement) {
    column += Math.max(1, sibling.colSpan);
    sibling = sibling.previousElementSibling;
  }
  return column;
}
function readTableSnapshot(table) {
  var _a, _b;
  const rows = Array.from(table.rows);
  const columnCount = rows.reduce(
    (maximum, row) => Math.max(maximum, getColumnCount(row)),
    0
  );
  if (rows.length === 0 || columnCount === 0) return null;
  const headerRow = (_b = (_a = table.tHead) == null ? void 0 : _a.rows[0]) != null ? _b : rows[0];
  const columnBases = Array.from({ length: columnCount }, (_, columnIndex) => {
    var _a2, _b2, _c, _d;
    const headerText = normalizeText(
      (_b2 = (_a2 = getCellAtColumn(headerRow, columnIndex)) == null ? void 0 : _a2.textContent) != null ? _b2 : ""
    );
    if (headerText) return headerText;
    for (const row of rows.slice(1, 5)) {
      const sample = normalizeText(
        (_d = (_c = getCellAtColumn(row, columnIndex)) == null ? void 0 : _c.textContent) != null ? _d : ""
      );
      if (sample) return sample;
    }
    return "blank";
  });
  const rowBases = rows.map((row) => {
    const cells = Array.from(row.cells).map(
      (cell) => {
        var _a2;
        return normalizeText((_a2 = cell.textContent) != null ? _a2 : "");
      }
    );
    const firstMeaningful = cells.find(Boolean);
    return firstMeaningful || cells.join("|") || "blank";
  });
  const fallbackColumnWidth = Math.max(1, table.getBoundingClientRect().width / columnCount);
  const naturalWidths = Array.from({ length: columnCount }, (_, columnIndex) => {
    const widths = rows.map((row) => getCellAtColumn(row, columnIndex)).filter((cell) => cell !== null && cell.colSpan === 1).map((cell) => cell.getBoundingClientRect().width).filter((width) => Number.isFinite(width) && width > 0);
    return widths.length > 0 ? Math.max(...widths) : fallbackColumnWidth;
  });
  const naturalHeights = rows.map((row) => {
    const height = row.getBoundingClientRect().height;
    return Number.isFinite(height) && height > 0 ? height : 28;
  });
  const columnKeys = makeUniqueKeys(columnBases, "column");
  const rowKeys = makeUniqueKeys(rowBases, "row");
  const signature = `${columnBases.join("|")}::${rowBases.slice(0, 4).join("|")}`;
  return {
    columnKeys,
    rowKeys,
    naturalWidths,
    naturalHeights,
    signature
  };
}
var TablePlusPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.data = { ...DEFAULT_DATA, settings: { ...DEFAULT_SETTINGS } };
    this.bindings = /* @__PURE__ */ new WeakMap();
    this.managedTables = /* @__PURE__ */ new Set();
    this.handles = null;
    this.hoverTarget = null;
    this.dragState = null;
    this.scanTimer = null;
    this.editorScanFrame = null;
    this.saveTimer = null;
    this.pendingEditorViews = /* @__PURE__ */ new Set();
    this.hostStyleBackups = /* @__PURE__ */ new WeakMap();
    this.idCounter = 0;
    this.isUnloading = false;
  }
  async onload() {
    await this.loadPluginData();
    this.addSettingTab(new TablePlusSettingTab(this.app, this));
    this.installHandles();
    this.installPointerEvents();
    this.registerMarkdownPostProcessor(
      (element, context) => {
        const section = context.getSectionInfo(element);
        element.querySelectorAll("table").forEach((table) => {
          var _a;
          this.prepareTable(table, {
            sourcePath: context.sourcePath,
            sectionStart: (_a = section == null ? void 0 : section.lineStart) != null ? _a : null
          });
        });
      }
    );
    this.registerEvent(
      this.app.workspace.on("layout-change", () => this.scheduleScan())
    );
    this.registerEvent(this.app.workspace.on("resize", () => this.scheduleScan()));
    this.registerEvent(
      this.app.workspace.on("editor-change", (_editor, info) => {
        if (info instanceof import_obsidian.MarkdownView) this.scheduleEditorTableAdoption(info);
      })
    );
    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        const newPath = file.path;
        let changed = false;
        Object.values(this.data.layouts).forEach((layout) => {
          if (layout.filePath === oldPath || layout.filePath.startsWith(`${oldPath}/`)) {
            layout.filePath = `${newPath}${layout.filePath.slice(oldPath.length)}`;
            changed = true;
          }
        });
        if (changed) this.queueSave();
      })
    );
    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        const deletedPath = file.path;
        let changed = false;
        Object.entries(this.data.layouts).forEach(([id, layout]) => {
          if (layout.filePath === deletedPath || layout.filePath.startsWith(`${deletedPath}/`)) {
            delete this.data.layouts[id];
            changed = true;
          }
        });
        if (changed) this.queueSave();
      })
    );
    this.addCommand({
      id: "reset-current-note-table-layouts",
      name: "\u91CD\u7F6E\u5F53\u524D\u7B14\u8BB0\u7684\u8868\u683C\u5C3A\u5BF8",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!(file instanceof import_obsidian.TFile)) return false;
        if (!checking) this.resetLayoutsForPath(file.path);
        return true;
      }
    });
    this.addCommand({
      id: "rescan-current-view",
      name: "\u91CD\u65B0\u8BC6\u522B\u5F53\u524D\u9875\u9762\u7684\u8868\u683C",
      callback: () => this.scanAllTables()
    });
    this.app.workspace.onLayoutReady(() => this.scanAllTables());
  }
  onunload() {
    var _a, _b;
    this.isUnloading = true;
    if (this.scanTimer !== null) window.clearTimeout(this.scanTimer);
    if (this.editorScanFrame !== null) {
      window.cancelAnimationFrame(this.editorScanFrame);
    }
    this.pendingEditorViews.clear();
    if (this.saveTimer !== null) window.clearTimeout(this.saveTimer);
    this.finishDrag(true);
    (_a = this.handles) == null ? void 0 : _a.vertical.remove();
    (_b = this.handles) == null ? void 0 : _b.horizontal.remove();
    this.handles = null;
    this.managedTables.forEach((table) => this.cleanTable(table));
    this.managedTables.clear();
    void this.saveData(this.data);
  }
  async updateSettings(patch) {
    this.data.settings = { ...this.data.settings, ...patch };
    await this.saveData(this.data);
    this.scanAllTables();
  }
  resetAllLayouts() {
    this.data.layouts = {};
    this.managedTables.forEach((table) => this.cleanTable(table));
    this.managedTables.clear();
    this.queueSave();
    this.scanAllTables();
    new import_obsidian.Notice("TablePlus\uFF1A\u5DF2\u91CD\u7F6E\u5168\u90E8\u8868\u683C\u5C3A\u5BF8");
  }
  async loadPluginData() {
    var _a, _b;
    const loaded = await this.loadData();
    this.data = {
      version: 1,
      settings: { ...DEFAULT_SETTINGS, ...(_a = loaded == null ? void 0 : loaded.settings) != null ? _a : {} },
      layouts: (_b = loaded == null ? void 0 : loaded.layouts) != null ? _b : {}
    };
  }
  queueSave() {
    if (this.isUnloading) return;
    if (this.saveTimer !== null) window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => {
      this.saveTimer = null;
      void this.saveData(this.data);
    }, 250);
  }
  scheduleScan(delay = 80) {
    if (this.isUnloading) return;
    if (this.scanTimer !== null) window.clearTimeout(this.scanTimer);
    this.scanTimer = window.setTimeout(() => {
      this.scanTimer = null;
      this.scanAllTables();
    }, delay);
  }
  /**
   * Structural table edits make Live Preview replace either the whole table or
   * just its rows/cells. Adopt only new or structurally incomplete tables on
   * the very next frame. This event cannot be retriggered by our own styles.
   */
  scheduleEditorTableAdoption(view) {
    if (this.isUnloading || !this.data.settings.enableLivePreview) return;
    this.pendingEditorViews.add(view);
    if (this.editorScanFrame !== null) return;
    this.editorScanFrame = window.requestAnimationFrame(() => {
      this.editorScanFrame = null;
      const views = [...this.pendingEditorViews];
      this.pendingEditorViews.clear();
      views.forEach((pendingView) => {
        if (!pendingView.containerEl.isConnected) return;
        pendingView.containerEl.querySelectorAll(".markdown-source-view table").forEach((table) => {
          if (this.tableNeedsAdoption(table)) this.prepareTable(table);
        });
      });
    });
  }
  tableNeedsAdoption(table) {
    const binding = this.bindings.get(table);
    if (!table.classList.contains("tableplus-managed") || !binding) return true;
    const rows = Array.from(table.rows);
    const columnCount = rows.reduce(
      (maximum, row) => Math.max(maximum, getColumnCount(row)),
      0
    );
    if (columnCount !== binding.appliedWidths.length || rows.length !== binding.appliedHeights.length) {
      return true;
    }
    if (!table.style.getPropertyValue("width")) return true;
    return rows.some(
      (row) => !row.style.getPropertyValue("height") || Array.from(row.cells).some(
        (cell) => !cell.style.getPropertyValue("width") || !cell.style.getPropertyValue("height")
      )
    );
  }
  installHandles() {
    const vertical = document.createElement("div");
    vertical.className = "tableplus-handle tableplus-handle-column";
    vertical.dataset.label = "\u62D6\u52A8\u5217\u5BBD \xB7 \u53CC\u51FB\u590D\u539F";
    vertical.setAttribute("aria-label", "\u62D6\u52A8\u8C03\u6574\u5217\u5BBD\uFF0C\u53CC\u51FB\u6062\u590D\u81EA\u52A8\u5BBD\u5EA6");
    const horizontal = document.createElement("div");
    horizontal.className = "tableplus-handle tableplus-handle-row";
    horizontal.dataset.label = "\u62D6\u52A8\u884C\u9AD8 \xB7 \u53CC\u51FB\u590D\u539F";
    horizontal.setAttribute("aria-label", "\u62D6\u52A8\u8C03\u6574\u884C\u9AD8\uFF0C\u53CC\u51FB\u6062\u590D\u81EA\u52A8\u9AD8\u5EA6");
    document.body.append(vertical, horizontal);
    this.handles = { vertical, horizontal };
    [vertical, horizontal].forEach((handle) => {
      this.registerDomEvent(handle, "pointerdown", (event) => {
        this.startDrag(event, handle);
      });
      this.registerDomEvent(handle, "dblclick", (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.resetHoveredDimension();
      });
    });
  }
  installPointerEvents() {
    this.registerDomEvent(document, "pointermove", (event) => {
      if (this.dragState) {
        this.updateDrag(event);
      } else {
        this.updateHover(event);
      }
    });
    this.registerDomEvent(document, "pointerup", (event) => {
      var _a;
      if (((_a = this.dragState) == null ? void 0 : _a.pointerId) === event.pointerId) this.finishDrag(false);
    });
    this.registerDomEvent(document, "pointercancel", (event) => {
      var _a;
      if (((_a = this.dragState) == null ? void 0 : _a.pointerId) === event.pointerId) this.finishDrag(true);
    });
    this.registerDomEvent(document, "keydown", (event) => {
      if (event.key === "Escape" && this.dragState) {
        event.preventDefault();
        this.finishDrag(true);
      }
    });
    this.registerDomEvent(
      document,
      "scroll",
      () => {
        if (!this.hoverTarget) return;
        if (this.dragState) {
          this.refreshHoverGeometry();
          this.showHandles();
        } else this.clearHover();
      },
      true
    );
  }
  scanAllTables() {
    if (this.dragState) return;
    document.querySelectorAll(
      ".markdown-source-view table, .markdown-reading-view table, .markdown-preview-view table"
    ).forEach((table) => this.prepareTable(table));
    this.managedTables.forEach((table) => {
      if (!table.isConnected) {
        this.managedTables.delete(table);
      } else if (!this.shouldManageTable(table)) {
        this.cleanTable(table);
        this.managedTables.delete(table);
      }
    });
  }
  shouldManageTable(table) {
    const inSourceView = table.closest(".markdown-source-view") !== null;
    const inReadingView = !inSourceView && table.closest(".markdown-reading-view, .markdown-preview-view") !== null;
    if (inSourceView) return this.data.settings.enableLivePreview;
    if (inReadingView) return this.data.settings.enableReadingView;
    return false;
  }
  prepareTable(table, hint = {}) {
    var _a, _b;
    if (!table.isConnected || !this.shouldManageTable(table)) return;
    const snapshot = readTableSnapshot(table);
    if (!snapshot) return;
    const context = this.resolveTableContext(table, hint);
    if (!context.sourcePath) return;
    const widget = table.closest(".cm-table-widget");
    const hintedLayoutId = (_a = table.dataset[DATA_LAYOUT_ID]) != null ? _a : widget == null ? void 0 : widget.dataset[DATA_LAYOUT_ID];
    const existingBinding = this.bindings.get(table);
    let layout = existingBinding ? this.data.layouts[existingBinding.layoutId] : hintedLayoutId ? this.data.layouts[hintedLayoutId] : void 0;
    if (!layout || layout.filePath !== context.sourcePath || this.isLayoutClaimedByAnotherTable(layout.id, table)) {
      layout = (_b = this.findBestLayout(snapshot, context, table)) != null ? _b : this.createLayout(snapshot, context);
    }
    const containerWidth = this.getContainerWidth(table);
    const structureChanged = this.reconcileLayout(
      layout,
      snapshot,
      containerWidth
    );
    layout.filePath = context.sourcePath;
    layout.sectionStart = context.sectionStart;
    layout.ordinal = context.ordinal;
    layout.signature = snapshot.signature;
    layout.updatedAt = Date.now();
    table.dataset[DATA_LAYOUT_ID] = layout.id;
    if (widget) widget.dataset[DATA_LAYOUT_ID] = layout.id;
    table.classList.add("tableplus-managed");
    table.style.setProperty("--tableplus-accent", this.data.settings.handleColor);
    this.managedTables.add(table);
    const binding = existingBinding != null ? existingBinding : {
      layoutId: layout.id,
      appliedWidths: [],
      appliedHeights: []
    };
    binding.layoutId = layout.id;
    this.bindings.set(table, binding);
    this.applyLayout(table, layout, binding);
    if (structureChanged) this.queueSave();
  }
  resolveTableContext(table, hint) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const leaves = this.app.workspace.getLeavesOfType("markdown");
    const view = leaves.map((leaf) => leaf.view).find(
      (candidate) => candidate instanceof import_obsidian.MarkdownView && candidate.containerEl.contains(table)
    );
    const sourcePath = (_c = (_b = hint.sourcePath) != null ? _b : (_a = view == null ? void 0 : view.file) == null ? void 0 : _a.path) != null ? _c : "";
    const inSourceView = table.closest(".markdown-source-view") !== null;
    const mode = inSourceView ? "live" : "reading";
    const scope = (_d = view == null ? void 0 : view.containerEl) != null ? _d : table.closest(".workspace-leaf-content");
    const ordinal = scope ? Array.from(scope.querySelectorAll("table")).indexOf(table) : null;
    let sectionStart = (_e = hint.sectionStart) != null ? _e : null;
    if (sectionStart === null && view && inSourceView) {
      const rect = table.getBoundingClientRect();
      const editorWithCoordinates = view.editor;
      sectionStart = (_h = (_g = (_f = editorWithCoordinates.posAtCoords) == null ? void 0 : _f.call(editorWithCoordinates, {
        left: rect.left + 2,
        top: rect.top + 2
      })) == null ? void 0 : _g.line) != null ? _h : null;
    }
    return { sourcePath, sectionStart, ordinal, mode };
  }
  findBestLayout(snapshot, context, table) {
    let best = null;
    let bestScore = 0;
    Object.values(this.data.layouts).filter(
      (layout) => layout.filePath === context.sourcePath && !this.isLayoutClaimedByAnotherTable(layout.id, table)
    ).forEach((layout) => {
      let score = 0;
      if (context.sectionStart !== null && layout.sectionStart !== null && context.sectionStart === layout.sectionStart) {
        score += 80;
      } else if (context.sectionStart !== null && layout.sectionStart !== null && Math.abs(context.sectionStart - layout.sectionStart) <= 2) {
        score += 25;
      }
      if (context.ordinal !== null && context.ordinal === layout.ordinal) score += 120;
      else if (context.ordinal !== null && layout.ordinal !== null) score -= 120;
      if (context.sectionStart !== null && layout.sectionStart !== null && Math.abs(context.sectionStart - layout.sectionStart) > 2) {
        score -= 25;
      }
      score += overlapRatio(snapshot.columnKeys, layout.columnKeys) * 45;
      score += overlapRatio(snapshot.rowKeys, layout.rowKeys) * 20;
      if (snapshot.signature === layout.signature) score += 20;
      const widthRange = layout.columnWidths.length > 0 ? Math.max(...layout.columnWidths) - Math.min(...layout.columnWidths) : 0;
      if (widthRange > 4) score += 40;
      if (layout.userAdjustedAt) score += 60;
      if (score > bestScore) {
        bestScore = score;
        best = layout;
      }
    });
    return bestScore >= 30 ? best : null;
  }
  /**
   * A rendered table must exclusively own its layout record. Older versions
   * could bind several tables with similar content to one record, causing a
   * drag on one table to be replayed onto all of them during the next scan.
   */
  isLayoutClaimedByAnotherTable(layoutId, currentTable) {
    var _a;
    for (const table of this.managedTables) {
      if (table === currentTable || !table.isConnected) continue;
      if (((_a = this.bindings.get(table)) == null ? void 0 : _a.layoutId) === layoutId) return true;
    }
    return false;
  }
  createLayout(snapshot, context) {
    const id = `table-${Date.now().toString(36)}-${(this.idCounter += 1).toString(36)}`;
    const minimumColumnWidth = this.data.settings.minimumColumnWidth;
    const minimumRowHeight = this.data.settings.minimumRowHeight;
    const widths = snapshot.naturalWidths.map(
      (width) => Math.max(minimumColumnWidth, width)
    );
    const heights = snapshot.naturalHeights.map(
      (height) => Math.max(minimumRowHeight, height)
    );
    const layout = {
      id,
      filePath: context.sourcePath,
      sectionStart: context.sectionStart,
      ordinal: context.ordinal,
      columnKeys: [...snapshot.columnKeys],
      columnWidths: roundDimensions(widths),
      rowKeys: [...snapshot.rowKeys],
      rowHeights: roundDimensions(heights),
      signature: snapshot.signature,
      lastContainerWidth: 0,
      lastAppliedWidth: 0,
      allowOverflow: false,
      userAdjustedAt: void 0,
      updatedAt: Date.now()
    };
    this.data.layouts[id] = layout;
    this.queueSave();
    return layout;
  }
  reconcileLayout(layout, snapshot, containerWidth) {
    const columnsChanged = !arraysEqual(layout.columnKeys, snapshot.columnKeys);
    const rowsChanged = !arraysEqual(layout.rowKeys, snapshot.rowKeys);
    if (!columnsChanged && !rowsChanged) return false;
    if (columnsChanged) {
      const previousLength = layout.columnKeys.length;
      const reconciled = reconcileByKeys(
        layout.columnKeys,
        layout.columnWidths,
        snapshot.columnKeys,
        snapshot.columnKeys.map(
          () => Math.max(
            this.data.settings.minimumColumnWidth,
            this.data.settings.defaultNewColumnWidth
          )
        ),
        this.data.settings.minimumColumnWidth
      );
      if (snapshot.columnKeys.length === previousLength && reconciled.insertedIndices.length === reconciled.removedKeys.length) {
        reconciled.insertedIndices.forEach((index) => {
          var _a;
          reconciled.values[index] = (_a = layout.columnWidths[index]) != null ? _a : reconciled.values[index];
        });
        reconciled.insertedIndices.length = 0;
      }
      let widths = reconciled.values;
      if (reconciled.insertedIndices.length > 0 && previousLength > 0 && containerWidth > 0 && sum(widths) > containerWidth) {
        const room = makeRoomForInsertedColumns(
          widths,
          reconciled.insertedIndices,
          containerWidth,
          this.data.settings.minimumColumnWidth
        );
        widths = room.widths;
        layout.allowOverflow = room.overflow > 0.01;
      } else if (snapshot.columnKeys.length < previousLength && sum(widths) <= containerWidth) {
        layout.allowOverflow = false;
      }
      layout.columnKeys = [...snapshot.columnKeys];
      layout.columnWidths = roundDimensions(widths);
    }
    if (rowsChanged) {
      const previousLength = layout.rowKeys.length;
      const reconciled = reconcileByKeys(
        layout.rowKeys,
        layout.rowHeights,
        snapshot.rowKeys,
        snapshot.naturalHeights,
        this.data.settings.minimumRowHeight
      );
      if (snapshot.rowKeys.length === previousLength && reconciled.insertedIndices.length === reconciled.removedKeys.length) {
        reconciled.insertedIndices.forEach((index) => {
          var _a;
          reconciled.values[index] = (_a = layout.rowHeights[index]) != null ? _a : reconciled.values[index];
        });
      }
      layout.rowKeys = [...snapshot.rowKeys];
      layout.rowHeights = roundDimensions(reconciled.values);
    }
    return true;
  }
  getContainerWidth(table) {
    const inSourceView = table.closest(".markdown-source-view") !== null;
    const contentHost = inSourceView ? table.closest(".cm-content") : table.closest(".markdown-preview-sizer");
    const fallbackHost = table.parentElement;
    const host = contentHost != null ? contentHost : fallbackHost;
    if (!host) return table.getBoundingClientRect().width;
    const style = getComputedStyle(host);
    const horizontalPadding = (Number.parseFloat(style.paddingLeft) || 0) + (Number.parseFloat(style.paddingRight) || 0);
    const measured = host.getBoundingClientRect().width - horizontalPadding;
    return Math.max(1, measured);
  }
  applyLayout(table, layout, binding) {
    const containerWidth = this.getContainerWidth(table);
    const fittedWidths = layout.allowOverflow ? layout.columnWidths.map(
      (width) => Math.max(this.data.settings.minimumColumnWidth, width)
    ) : fitWidths(
      layout.columnWidths,
      containerWidth,
      this.data.settings.minimumColumnWidth
    ).widths;
    const appliedWidths = roundDimensions(fittedWidths);
    const appliedTableWidth = sum(appliedWidths);
    table.style.setProperty("table-layout", "fixed", "important");
    table.style.setProperty("width", `${appliedTableWidth}px`, "important");
    table.style.setProperty("max-width", "none", "important");
    this.applyHostSizing(table, appliedTableWidth);
    Array.from(table.rows).forEach((row, rowIndex) => {
      var _a;
      const rowHeight = Math.max(
        this.data.settings.minimumRowHeight,
        (_a = layout.rowHeights[rowIndex]) != null ? _a : this.data.settings.minimumRowHeight
      );
      row.style.setProperty("height", `${rowHeight}px`, "important");
      Array.from(row.cells).forEach((cell) => {
        const start = getCellStartColumn(cell);
        const span = Math.max(1, cell.colSpan);
        const width = sum(appliedWidths.slice(start, start + span));
        if (width <= 0) return;
        cell.style.setProperty("width", `${width}px`, "important");
        cell.style.setProperty("min-width", `${width}px`, "important");
        cell.style.setProperty("max-width", `${width}px`, "important");
        cell.style.setProperty("height", `${rowHeight}px`, "important");
      });
    });
    layout.lastContainerWidth = containerWidth;
    layout.lastAppliedWidth = appliedTableWidth;
    binding.appliedWidths = appliedWidths;
    binding.appliedHeights = Array.from(table.rows).map(
      (_, index) => {
        var _a;
        return (_a = layout.rowHeights[index]) != null ? _a : this.data.settings.minimumRowHeight;
      }
    );
  }
  cleanTable(table) {
    this.restoreHostSizing(table);
    table.classList.remove("tableplus-managed");
    const widget = table.closest(".cm-table-widget");
    if (widget && widget.dataset[DATA_LAYOUT_ID] === table.dataset[DATA_LAYOUT_ID]) {
      delete widget.dataset[DATA_LAYOUT_ID];
    }
    delete table.dataset[DATA_LAYOUT_ID];
    table.style.removeProperty("--tableplus-accent");
    table.style.removeProperty("table-layout");
    table.style.removeProperty("width");
    table.style.removeProperty("max-width");
    Array.from(table.rows).forEach((row) => {
      row.style.removeProperty("height");
      Array.from(row.cells).forEach((cell) => {
        cell.style.removeProperty("width");
        cell.style.removeProperty("min-width");
        cell.style.removeProperty("max-width");
        cell.style.removeProperty("height");
      });
    });
  }
  applyHostSizing(table, width) {
    const wrapper = table.closest(".table-wrapper");
    if (wrapper) {
      this.backupHostStyle(wrapper);
      wrapper.classList.add("tableplus-wrapper");
      wrapper.style.setProperty("box-sizing", "border-box", "important");
      wrapper.style.setProperty("width", `${width}px`, "important");
      wrapper.style.setProperty("min-width", `${width}px`, "important");
      wrapper.style.setProperty("max-width", "none", "important");
    }
    const widget = table.closest(".cm-table-widget");
    if (widget) {
      this.backupHostStyle(widget);
      widget.classList.add("tableplus-widget");
      widget.style.setProperty("box-sizing", "border-box", "important");
      widget.style.setProperty("max-width", "100%", "important");
      widget.style.setProperty("overflow-x", "auto", "important");
    }
  }
  restoreHostSizing(table) {
    const wrapper = table.closest(".table-wrapper");
    if (wrapper) this.restoreHostStyle(wrapper, "tableplus-wrapper");
    const widget = table.closest(".cm-table-widget");
    if (widget) this.restoreHostStyle(widget, "tableplus-widget");
  }
  backupHostStyle(element) {
    if (this.hostStyleBackups.has(element)) return;
    this.hostStyleBackups.set(element, element.getAttribute("style"));
  }
  restoreHostStyle(element, className) {
    var _a;
    element.classList.remove(className);
    if (!this.hostStyleBackups.has(element)) return;
    const originalStyle = (_a = this.hostStyleBackups.get(element)) != null ? _a : null;
    this.restoreAttribute(element, "style", originalStyle);
    this.hostStyleBackups.delete(element);
  }
  restoreAttribute(element, name, value) {
    if (value === null) element.removeAttribute(name);
    else element.setAttribute(name, value);
  }
  updateHover(event) {
    var _a, _b, _c, _d;
    if (!this.handles) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target == null ? void 0 : target.closest(".tableplus-handle")) return;
    const cell = target == null ? void 0 : target.closest("th, td");
    const rawTable = cell == null ? void 0 : cell.closest("table");
    if (rawTable instanceof HTMLTableElement && !rawTable.classList.contains("tableplus-managed") && this.shouldManageTable(rawTable)) {
      this.prepareTable(rawTable);
    }
    const table = (rawTable == null ? void 0 : rawTable.classList.contains("tableplus-managed")) ? rawTable : null;
    if (!(cell instanceof HTMLTableCellElement) || !(table instanceof HTMLTableElement)) {
      this.clearHover();
      return;
    }
    const row = cell.parentElement;
    if (!(row instanceof HTMLTableRowElement)) {
      this.clearHover();
      return;
    }
    const rect = cell.getBoundingClientRect();
    const hitArea = this.data.settings.borderHitArea;
    const startColumn = getCellStartColumn(cell);
    const endColumn = startColumn + Math.max(1, cell.colSpan) - 1;
    const rowIndex = row.rowIndex;
    const edges = [
      { distance: Math.abs(event.clientX - rect.right), index: endColumn, x: rect.right },
      {
        distance: startColumn > 0 ? Math.abs(event.clientX - rect.left) : Infinity,
        index: startColumn - 1,
        x: rect.left
      }
    ].sort((left, right) => left.distance - right.distance);
    const rowEdges = [
      { distance: Math.abs(event.clientY - rect.bottom), index: rowIndex, y: rect.bottom },
      {
        distance: rowIndex > 0 ? Math.abs(event.clientY - rect.top) : Infinity,
        index: rowIndex - 1,
        y: rect.top
      }
    ].sort((left, right) => left.distance - right.distance);
    const columnEdge = edges[0].distance <= hitArea ? edges[0] : null;
    const rowEdge = rowEdges[0].distance <= hitArea ? rowEdges[0] : null;
    if (!columnEdge && !rowEdge) {
      this.clearHover();
      return;
    }
    const mode = columnEdge && rowEdge ? "both" : columnEdge ? "column" : "row";
    this.hoverTarget = {
      table,
      mode,
      columnIndex: (_a = columnEdge == null ? void 0 : columnEdge.index) != null ? _a : null,
      rowIndex: (_b = rowEdge == null ? void 0 : rowEdge.index) != null ? _b : null,
      verticalX: (_c = columnEdge == null ? void 0 : columnEdge.x) != null ? _c : null,
      horizontalY: (_d = rowEdge == null ? void 0 : rowEdge.y) != null ? _d : null
    };
    this.showHandles();
  }
  showHandles() {
    if (!this.handles || !this.hoverTarget) return;
    const visibleRect = this.getVisibleTableRect(this.hoverTarget.table);
    const color = this.data.settings.handleColor;
    const showColumn = this.hoverTarget.mode === "column" || this.hoverTarget.mode === "both";
    const showRow = this.hoverTarget.mode === "row" || this.hoverTarget.mode === "both";
    this.handles.vertical.style.setProperty("--tableplus-accent", color);
    this.handles.horizontal.style.setProperty("--tableplus-accent", color);
    const columnIsVisible = visibleRect !== null && this.hoverTarget.verticalX !== null && this.hoverTarget.verticalX >= visibleRect.left && this.hoverTarget.verticalX <= visibleRect.right;
    if (showColumn && columnIsVisible && this.hoverTarget.verticalX !== null) {
      this.handles.vertical.style.left = `${this.hoverTarget.verticalX}px`;
      this.handles.vertical.style.top = `${visibleRect.top}px`;
      this.handles.vertical.style.height = `${visibleRect.height}px`;
      this.handles.vertical.classList.add("is-active");
    } else {
      this.handles.vertical.classList.remove("is-active");
    }
    const rowIsVisible = visibleRect !== null && this.hoverTarget.horizontalY !== null && this.hoverTarget.horizontalY >= visibleRect.top && this.hoverTarget.horizontalY <= visibleRect.bottom;
    if (showRow && rowIsVisible && this.hoverTarget.horizontalY !== null) {
      this.handles.horizontal.style.left = `${visibleRect.left}px`;
      this.handles.horizontal.style.top = `${this.hoverTarget.horizontalY}px`;
      this.handles.horizontal.style.width = `${visibleRect.width}px`;
      this.handles.horizontal.classList.add("is-active");
    } else {
      this.handles.horizontal.classList.remove("is-active");
    }
    document.body.dataset.tableplusCursor = this.hoverTarget.mode === "both" ? "both" : this.hoverTarget.mode === "column" ? "column" : "row";
  }
  getVisibleTableRect(table) {
    const tableRect = table.getBoundingClientRect();
    const root = table.ownerDocument.documentElement;
    let left = Math.max(0, tableRect.left);
    let top = Math.max(0, tableRect.top);
    let right = Math.min(root.clientWidth, tableRect.right);
    let bottom = Math.min(root.clientHeight, tableRect.bottom);
    const clippingElements = /* @__PURE__ */ new Set();
    [
      table.closest(".cm-table-widget"),
      table.closest(".cm-scroller"),
      table.closest(".markdown-source-view"),
      table.closest(
        ".markdown-reading-view, .markdown-preview-view"
      ),
      table.closest(".view-content")
    ].forEach((element) => {
      if (element) clippingElements.add(element);
    });
    clippingElements.forEach((element) => {
      const rect = element.getBoundingClientRect();
      left = Math.max(left, rect.left);
      top = Math.max(top, rect.top);
      right = Math.min(right, rect.right);
      bottom = Math.min(bottom, rect.bottom);
    });
    if (right <= left || bottom <= top) return null;
    return {
      left,
      top,
      right,
      bottom,
      width: right - left,
      height: bottom - top
    };
  }
  refreshHoverGeometry() {
    var _a, _b, _c;
    const hover = this.hoverTarget;
    if (!hover) return;
    if (hover.columnIndex !== null) {
      const firstRow = hover.table.rows[0];
      const boundaryCell = firstRow ? getCellAtColumn(firstRow, hover.columnIndex) : null;
      hover.verticalX = (_a = boundaryCell == null ? void 0 : boundaryCell.getBoundingClientRect().right) != null ? _a : null;
    }
    if (hover.rowIndex !== null) {
      hover.horizontalY = (_c = (_b = hover.table.rows[hover.rowIndex]) == null ? void 0 : _b.getBoundingClientRect().bottom) != null ? _c : null;
    }
  }
  clearHover() {
    var _a, _b;
    if (this.dragState) return;
    this.hoverTarget = null;
    (_a = this.handles) == null ? void 0 : _a.vertical.classList.remove("is-active");
    (_b = this.handles) == null ? void 0 : _b.horizontal.classList.remove("is-active");
    delete document.body.dataset.tableplusCursor;
  }
  startDrag(event, handle) {
    var _a;
    if (!this.hoverTarget || event.button !== 0) return;
    const binding = this.bindings.get(this.hoverTarget.table);
    const layout = binding ? this.data.layouts[binding.layoutId] : void 0;
    if (!binding || !layout) return;
    event.preventDefault();
    event.stopPropagation();
    handle.setPointerCapture(event.pointerId);
    this.dragState = {
      pointerId: event.pointerId,
      table: this.hoverTarget.table,
      layout,
      mode: this.hoverTarget.mode,
      columnIndex: this.hoverTarget.columnIndex,
      rowIndex: this.hoverTarget.rowIndex,
      startX: event.clientX,
      startY: event.clientY,
      startWidths: [...binding.appliedWidths],
      startHeights: [...binding.appliedHeights],
      originalPreferredWidths: [...layout.columnWidths],
      originalPreferredHeights: [...layout.rowHeights],
      originalAllowOverflow: (_a = layout.allowOverflow) != null ? _a : false,
      containerWidth: this.getContainerWidth(this.hoverTarget.table),
      captureEl: handle
    };
    document.body.classList.add("tableplus-is-resizing");
    document.body.dataset.tableplusCursor = this.dragState.mode === "both" ? "both" : this.dragState.mode === "column" ? "column" : "row";
  }
  updateDrag(event) {
    var _a;
    const drag = this.dragState;
    if (!drag || event.pointerId !== drag.pointerId) return;
    const binding = this.bindings.get(drag.table);
    if (!binding) return;
    event.preventDefault();
    if ((drag.mode === "column" || drag.mode === "both") && drag.columnIndex !== null) {
      const deltaX = event.clientX - drag.startX;
      const resized = resizeColumn(
        drag.startWidths,
        drag.columnIndex,
        deltaX,
        drag.containerWidth,
        this.data.settings.minimumColumnWidth
      );
      drag.layout.columnWidths = roundDimensions(resized.widths);
      drag.layout.allowOverflow = resized.overflow > 0.01;
    }
    if ((drag.mode === "row" || drag.mode === "both") && drag.rowIndex !== null) {
      const deltaY = event.clientY - drag.startY;
      const heights = [...drag.startHeights];
      heights[drag.rowIndex] = Math.max(
        this.data.settings.minimumRowHeight,
        ((_a = drag.startHeights[drag.rowIndex]) != null ? _a : this.data.settings.minimumRowHeight) + deltaY
      );
      drag.layout.rowHeights = roundDimensions(heights);
    }
    drag.layout.updatedAt = Date.now();
    this.applyLayout(drag.table, drag.layout, binding);
    if (this.hoverTarget) {
      this.refreshHoverGeometry();
      this.showHandles();
    }
  }
  finishDrag(cancelled) {
    const drag = this.dragState;
    if (!drag) return;
    const binding = this.bindings.get(drag.table);
    if (cancelled) {
      drag.layout.columnWidths = drag.originalPreferredWidths;
      drag.layout.rowHeights = drag.originalPreferredHeights;
      drag.layout.allowOverflow = drag.originalAllowOverflow;
      if (binding) this.applyLayout(drag.table, drag.layout, binding);
    } else {
      drag.layout.updatedAt = Date.now();
      drag.layout.userAdjustedAt = Date.now();
      if (binding) this.applyLayout(drag.table, drag.layout, binding);
      this.queueSave();
    }
    if (drag.captureEl.hasPointerCapture(drag.pointerId)) {
      drag.captureEl.releasePointerCapture(drag.pointerId);
    }
    this.dragState = null;
    document.body.classList.remove("tableplus-is-resizing");
    this.clearHover();
    this.scheduleScan(cancelled ? 50 : 80);
  }
  resetHoveredDimension() {
    var _a, _b;
    const hover = this.hoverTarget;
    if (!hover) return;
    const binding = this.bindings.get(hover.table);
    const layout = binding ? this.data.layouts[binding.layoutId] : void 0;
    const snapshot = readTableSnapshot(hover.table);
    if (!binding || !layout || !snapshot) return;
    if ((hover.mode === "column" || hover.mode === "both") && hover.columnIndex !== null) {
      layout.columnWidths[hover.columnIndex] = clamp(
        (_a = snapshot.naturalWidths[hover.columnIndex]) != null ? _a : this.data.settings.defaultNewColumnWidth,
        this.data.settings.minimumColumnWidth,
        Math.max(
          this.data.settings.minimumColumnWidth,
          this.data.settings.defaultNewColumnWidth
        )
      );
    }
    if ((hover.mode === "row" || hover.mode === "both") && hover.rowIndex !== null) {
      layout.rowHeights[hover.rowIndex] = Math.max(
        this.data.settings.minimumRowHeight,
        (_b = snapshot.naturalHeights[hover.rowIndex]) != null ? _b : this.data.settings.minimumRowHeight
      );
    }
    layout.allowOverflow = sum(layout.columnWidths) > this.getContainerWidth(hover.table) + 0.01;
    layout.updatedAt = Date.now();
    layout.userAdjustedAt = Date.now();
    this.applyLayout(hover.table, layout, binding);
    this.queueSave();
    this.showHandles();
  }
  resetLayoutsForPath(path) {
    let removed = 0;
    Object.entries(this.data.layouts).forEach(([id, layout]) => {
      if (layout.filePath === path) {
        delete this.data.layouts[id];
        removed += 1;
      }
    });
    this.managedTables.forEach((table) => {
      const binding = this.bindings.get(table);
      if (binding && !this.data.layouts[binding.layoutId]) this.cleanTable(table);
    });
    this.queueSave();
    this.scanAllTables();
    new import_obsidian.Notice(
      removed > 0 ? `TablePlus\uFF1A\u5DF2\u91CD\u7F6E\u5F53\u524D\u7B14\u8BB0\u7684 ${removed} \u4E2A\u8868\u683C` : "TablePlus\uFF1A\u5F53\u524D\u7B14\u8BB0\u6CA1\u6709\u5DF2\u4FDD\u5B58\u7684\u8868\u683C\u5C3A\u5BF8"
    );
  }
};
var TablePlusSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    const settings = this.plugin.data.settings;
    containerEl.empty();
    containerEl.createEl("h2", { text: "TablePlus" });
    containerEl.createEl("p", {
      text: "\u5C3A\u5BF8\u4FDD\u5B58\u5728\u63D2\u4EF6\u6570\u636E\u4E2D\uFF0C\u4E0D\u4F1A\u6539\u5199 Markdown \u8868\u683C\u5185\u5BB9\u3002\u53CC\u51FB\u62D6\u62FD\u6807\u8BB0\u53EF\u6062\u590D\u5355\u884C\u6216\u5355\u5217\u7684\u81EA\u52A8\u5C3A\u5BF8\u3002",
      cls: "setting-item-description"
    });
    new import_obsidian.Setting(containerEl).setName("\u5B9E\u65F6\u9884\u89C8\u6A21\u5F0F").setDesc("\u5728\u5B9E\u65F6\u9884\u89C8\u4E2D\u7684\u539F\u751F Markdown \u8868\u683C\u4E0A\u663E\u793A\u62D6\u62FD\u6807\u8BB0\u3002").addToggle(
      (toggle) => toggle.setValue(settings.enableLivePreview).onChange(async (value) => {
        await this.plugin.updateSettings({ enableLivePreview: value });
      })
    );
    new import_obsidian.Setting(containerEl).setName("\u9605\u8BFB\u6A21\u5F0F").setDesc("\u5728\u9605\u8BFB\u6A21\u5F0F\u7684 Markdown \u8868\u683C\u4E0A\u663E\u793A\u62D6\u62FD\u6807\u8BB0\u3002").addToggle(
      (toggle) => toggle.setValue(settings.enableReadingView).onChange(async (value) => {
        await this.plugin.updateSettings({ enableReadingView: value });
      })
    );
    new import_obsidian.Setting(containerEl).setName("\u6700\u5C0F\u5217\u5BBD").setDesc("\u5217\u88AB\u538B\u7F29\u65F6\u5141\u8BB8\u7684\u6700\u5C0F\u5BBD\u5EA6\uFF0C\u5355\u4F4D\u4E3A\u50CF\u7D20\u3002").addSlider(
      (slider) => slider.setLimits(32, 120, 4).setDynamicTooltip().setValue(settings.minimumColumnWidth).onChange(async (value) => {
        await this.plugin.updateSettings({ minimumColumnWidth: value });
      })
    );
    new import_obsidian.Setting(containerEl).setName("\u65B0\u589E\u5217\u9ED8\u8BA4\u5BBD\u5EA6").setDesc("\u65B0\u589E\u5217\u7684\u521D\u59CB\u5BBD\u5EA6\u4E0A\u9650\uFF0C\u9875\u9762\u6EE1\u5BBD\u65F6\u4F18\u5148\u538B\u7F29\u539F\u6709\u5217\u3002").addSlider(
      (slider) => slider.setLimits(64, 240, 8).setDynamicTooltip().setValue(settings.defaultNewColumnWidth).onChange(async (value) => {
        await this.plugin.updateSettings({ defaultNewColumnWidth: value });
      })
    );
    new import_obsidian.Setting(containerEl).setName("\u6700\u5C0F\u884C\u9AD8").setDesc("\u884C\u53EF\u7F29\u5C0F\u5230\u7684\u6700\u4F4E\u9AD8\u5EA6\uFF0C\u5355\u5143\u683C\u5185\u5BB9\u4ECD\u53EF\u80FD\u6491\u9AD8\u8BE5\u884C\u3002").addSlider(
      (slider) => slider.setLimits(20, 72, 2).setDynamicTooltip().setValue(settings.minimumRowHeight).onChange(async (value) => {
        await this.plugin.updateSettings({ minimumRowHeight: value });
      })
    );
    new import_obsidian.Setting(containerEl).setName("\u8FB9\u6846\u611F\u5E94\u8303\u56F4").setDesc("\u9F20\u6807\u8DDD\u79BB\u8FB9\u6846\u591A\u5C11\u50CF\u7D20\u65F6\u663E\u793A\u62D6\u62FD\u6807\u8BB0\u3002").addSlider(
      (slider) => slider.setLimits(3, 12, 1).setDynamicTooltip().setValue(settings.borderHitArea).onChange(async (value) => {
        await this.plugin.updateSettings({ borderHitArea: value });
      })
    );
    new import_obsidian.Setting(containerEl).setName("\u62D6\u62FD\u6807\u8BB0\u989C\u8272").setDesc("\u5217\u7EBF\u3001\u884C\u7EBF\u4E0E\u63D0\u793A\u6807\u8BB0\u7684\u989C\u8272\u3002").addColorPicker(
      (picker) => picker.setValue(settings.handleColor).onChange(async (value) => {
        await this.plugin.updateSettings({ handleColor: value });
      })
    );
    new import_obsidian.Setting(containerEl).setName("\u91CD\u7F6E\u5168\u90E8\u5C3A\u5BF8").setDesc("\u5220\u9664 TablePlus \u4FDD\u5B58\u7684\u5168\u90E8\u884C\u9AD8\u548C\u5217\u5BBD\uFF1B\u4E0D\u4F1A\u4FEE\u6539\u7B14\u8BB0\u5185\u5BB9\u3002").addButton(
      (button) => button.setButtonText("\u5168\u90E8\u91CD\u7F6E").setWarning().onClick(() => this.plugin.resetAllLayouts())
    );
  }
};
