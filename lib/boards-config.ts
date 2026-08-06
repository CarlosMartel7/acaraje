import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { normalizeWidgetSize } from "./boards-layout";

function configPath(): string {
  return path.join(process.cwd(), "acaraje.boards.json");
}

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "page";
}

function defaultConfig(): Boards.ConfigFile {
  return {
    pages: [{ id: `pg_${randomUUID()}`, slug: "overview", name: "Overview", order: 0, widgets: [] }],
  };
}

export function readConfig(): Boards.ConfigFile {
  const filePath = configPath();
  if (!fs.existsSync(filePath)) {
    const config = defaultConfig();
    writeConfig(config);
    return config;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as Boards.ConfigFile;
}

export function writeConfig(config: Boards.ConfigFile): void {
  fs.writeFileSync(configPath(), JSON.stringify(config, null, 2) + "\n", "utf-8");
}

export function listPages(): Boards.Page[] {
  return [...readConfig().pages].sort((a, b) => a.order - b.order);
}

export function getPage(slug: string): Boards.Page | null {
  return readConfig().pages.find((p) => p.slug === slug) ?? null;
}

function uniqueSlug(config: Boards.ConfigFile, base: string): string {
  const existing = new Set(config.pages.map((p) => p.slug));
  if (!existing.has(base)) return base;
  let i = 2;
  while (existing.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

export function createPage(name: string): Boards.Page {
  const config = readConfig();
  const slug = uniqueSlug(config, slugify(name));
  const order = config.pages.length ? Math.max(...config.pages.map((p) => p.order)) + 1 : 0;
  const page: Boards.Page = { id: `pg_${randomUUID()}`, slug, name, order, widgets: [] };
  config.pages.push(page);
  writeConfig(config);
  return page;
}

export function renamePage(id: string, name: string): Boards.Page | null {
  const config = readConfig();
  const page = config.pages.find((p) => p.id === id);
  if (!page) return null;
  page.name = name;
  writeConfig(config);
  return page;
}

export function reorderPages(orderedIds: string[]): Boards.Page[] {
  const config = readConfig();
  orderedIds.forEach((id, index) => {
    const page = config.pages.find((p) => p.id === id);
    if (page) page.order = index;
  });
  writeConfig(config);
  return listPages();
}

export function deletePage(id: string): boolean {
  const config = readConfig();
  const index = config.pages.findIndex((p) => p.id === id);
  if (index === -1) return false;
  config.pages.splice(index, 1);
  writeConfig(config);
  return true;
}

export function addWidget(pageId: string, widget: Omit<Boards.WidgetConfig, "id" | "order">): Boards.WidgetConfig | null {
  const config = readConfig();
  const page = config.pages.find((p) => p.id === pageId);
  if (!page) return null;
  const order = page.widgets.length ? Math.max(...page.widgets.map((w) => w.order)) + 1 : 0;
  const normalized = normalizeWidgetPayload(widget);
  const newWidget: Boards.WidgetConfig = { id: `wg_${randomUUID()}`, order, ...normalized };
  page.widgets.push(newWidget);
  writeConfig(config);
  return newWidget;
}

function normalizeWidgetPayload(widget: Omit<Boards.WidgetConfig, "id" | "order">): Omit<Boards.WidgetConfig, "id" | "order"> {
  const chartType = widget.metric.chartType;
  const size = normalizeWidgetSize(chartType, widget.size);
  const display = sanitizeDisplay(widget.display);
  return { ...widget, size, display };
}

function sanitizeDisplay(display?: Boards.WidgetDisplay): Boards.WidgetDisplay | undefined {
  if (!display) return undefined;
  const out: Boards.WidgetDisplay = {};
  if (display.subtitle?.trim()) out.subtitle = display.subtitle.trim();
  if (display.color?.trim()) out.color = display.color.trim();
  if (display.colors?.length) out.colors = display.colors.map((c) => c.trim()).filter(Boolean);
  if (display.xAxisLabel?.trim()) out.xAxisLabel = display.xAxisLabel.trim();
  if (display.yAxisLabel?.trim()) out.yAxisLabel = display.yAxisLabel.trim();
  if (display.seriesLabels && Object.keys(display.seriesLabels).length) {
    out.seriesLabels = Object.fromEntries(
      Object.entries(display.seriesLabels)
        .filter(([, v]) => v.trim())
        .map(([k, v]) => [k, v.trim()]),
    );
  }
  return Object.keys(out).length ? out : undefined;
}

export function updateWidget(
  pageId: string,
  widgetId: string,
  patch: Partial<Omit<Boards.WidgetConfig, "id">>,
): Boards.WidgetConfig | null {
  const config = readConfig();
  const page = config.pages.find((p) => p.id === pageId);
  const widget = page?.widgets.find((w) => w.id === widgetId);
  if (!page || !widget) return null;
  const merged = { ...widget, ...patch };
  const normalized = normalizeWidgetPayload(merged);
  Object.assign(widget, normalized);
  writeConfig(config);
  return widget;
}

export function reorderWidgets(pageId: string, orderedIds: string[]): Boards.WidgetConfig[] {
  const config = readConfig();
  const page = config.pages.find((p) => p.id === pageId);
  if (!page) return [];
  orderedIds.forEach((id, index) => {
    const widget = page.widgets.find((w) => w.id === id);
    if (widget) widget.order = index;
  });
  writeConfig(config);
  return [...page.widgets].sort((a, b) => a.order - b.order);
}

export function removeWidget(pageId: string, widgetId: string): boolean {
  const config = readConfig();
  const page = config.pages.find((p) => p.id === pageId);
  if (!page) return false;
  const index = page.widgets.findIndex((w) => w.id === widgetId);
  if (index === -1) return false;
  page.widgets.splice(index, 1);
  writeConfig(config);
  return true;
}
