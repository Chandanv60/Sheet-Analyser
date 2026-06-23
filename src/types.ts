export type ChartType = "bar" | "line" | "area" | "pie" | "scatter" | "radial" | "table";
export type AggregationType = "sum" | "average" | "count" | "min" | "max";

export interface ColumnSchema {
  name: string;
  type: "numerical" | "categorical" | "temporal" | "text";
  description: string;
}

export interface Suggestion {
  title: string;
  description: string;
  chartType: ChartType;
  dimension: string;
  metric: string;
  aggregation: AggregationType;
}

export interface SheetData {
  spreadsheetId?: string;
  gid?: string | null;
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
  colCount: number;
}

export interface ReportConfig {
  title: string;
  chartType: ChartType;
  dimension: string;
  metric: string;
  aggregation: AggregationType;
  filters: FilterCondition[];
}

export interface FilterCondition {
  column: string;
  operator: "equals" | "contains" | "greaterThan" | "lessThan" | "notEquals";
  value: string;
}

export interface AggregatedDataPoint {
  dimensionValue: string;
  metricValue: number;
  count: number;
  rawMetricValues: number[];
  [key: string]: any; // For flexible chart rendering
}
