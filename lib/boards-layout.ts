/** Fixed board canvas: 4 columns × 3 rows of base cells. */
export const BOARD_GRID_COLS = 4;
export const BOARD_GRID_ROWS = 3;

export type WidgetSize = "1x1" | "2x2" | "3x3";

export const WIDGET_SIZE_SPANS: Record<WidgetSize, { col: number; row: number }> = {
  "1x1": { col: 1, row: 1 },
  "2x2": { col: 2, row: 2 },
  "3x3": { col: 3, row: 3 },
};

export const WIDGET_SIZE_OPTIONS: { value: WidgetSize; label: string }[] = [
  { value: "1x1", label: "1×1 (stat)" },
  { value: "2x2", label: "2×2 (medium)" },
  { value: "3x3", label: "3×3 (large)" },
];

export function defaultSizeForChart(chartType: Boards.ChartType): WidgetSize {
  return chartType === "stat" ? "1x1" : "2x2";
}

export function allowedSizesForChart(chartType: Boards.ChartType): WidgetSize[] {
  if (chartType === "stat") return ["1x1"];
  return ["2x2", "3x3"];
}

export function normalizeWidgetSize(chartType: Boards.ChartType, size?: WidgetSize): WidgetSize {
  const allowed = allowedSizesForChart(chartType);
  if (size && allowed.includes(size)) return size;
  return defaultSizeForChart(chartType);
}

export const BOARD_GRID_CLASS = "grid grid-cols-4 gap-4 auto-rows-fr";

export interface WidgetPlacement {
  widget: Boards.WidgetConfig;
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
}

function findPlacement(occupied: Set<string>, rowSpan: number, colSpan: number): { row: number; col: number } {
  for (let row = 0; ; row++) {
    for (let col = 0; col <= BOARD_GRID_COLS - colSpan; col++) {
      let fits = true;
      for (let dr = 0; dr < rowSpan && fits; dr++) {
        for (let dc = 0; dc < colSpan; dc++) {
          if (occupied.has(`${row + dr},${col + dc}`)) {
            fits = false;
            break;
          }
        }
      }
      if (fits) return { row, col };
    }
  }
}

/** First-fit row-major packing (mirrors `grid-auto-flow: dense` closely enough for this UI) done
 *  explicitly in JS — CSS auto-placement can't be introspected, and knowing exactly which cells
 *  are empty is what the "hover to add a widget" affordance needs. */
export function packBoard(widgets: Boards.WidgetConfig[]): {
  placements: WidgetPlacement[];
  maxRow: number;
  occupied: Set<string>;
} {
  const occupied = new Set<string>();
  const placements: WidgetPlacement[] = [];
  let maxRow = 0;

  for (const widget of widgets) {
    const span = WIDGET_SIZE_SPANS[normalizeWidgetSize(widget.metric.chartType, widget.size)];
    const { row, col } = findPlacement(occupied, span.row, span.col);
    for (let dr = 0; dr < span.row; dr++) {
      for (let dc = 0; dc < span.col; dc++) occupied.add(`${row + dr},${col + dc}`);
    }
    placements.push({ widget, row, col, rowSpan: span.row, colSpan: span.col });
    maxRow = Math.max(maxRow, row + span.row);
  }

  return { placements, maxRow, occupied };
}

export function emptyCells(rows: number, occupied: Set<string>): { row: number; col: number }[] {
  const cells: { row: number; col: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < BOARD_GRID_COLS; c++) {
      if (!occupied.has(`${r},${c}`)) cells.push({ row: r, col: c });
    }
  }
  return cells;
}
