import { AggregatedDataPoint, ReportConfig } from './types';

// Robust local CSV string parser for handling sample data
export function clientParseCSV(csvContent: string): { headers: string[]; rows: Record<string, string>[] } {
  const result: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  
  for (let i = 0; i < csvContent.length; i++) {
    const char = csvContent[i];
    const nextChar = csvContent[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(cell.trim());
      result.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  
  if (cell || row.length > 0) {
    row.push(cell.trim());
    result.push(row);
  }
  
  const parsed = result.filter(r => r.length > 0 && r.some(col => col !== ""));
  if (parsed.length === 0) return { headers: [], rows: [] };
  
  const headers = parsed[0].map(h => h || "Unnamed Column");
  const dataRows = parsed.slice(1);
  
  const records = dataRows.map((rowArr, rowIndex) => {
    const record: Record<string, string> = { __id: String(rowIndex + 1) };
    headers.forEach((header, colIndex) => {
      record[header] = rowArr[colIndex] !== undefined ? rowArr[colIndex] : "";
    });
    return record;
  });
  
  return { headers, rows: records };
}

// Client-side grouping, filtering and multi-aggregation routine
export function aggregateData(
  rows: Record<string, string>[],
  config: ReportConfig
): AggregatedDataPoint[] {
  const { dimension, metric, aggregation, filters } = config;
  
  if (!dimension) return [];
  
  // 1. Filter rows
  let filteredRows = [...rows];
  
  for (const filter of filters) {
    if (!filter.column || !filter.operator) continue;
    filteredRows = filteredRows.filter(row => {
      const cellVal = String(row[filter.column] || "").toLowerCase().trim();
      const matchVal = String(filter.value || "").toLowerCase().trim();
      
      switch (filter.operator) {
        case "equals":
          return cellVal === matchVal;
        case "notEquals":
          return cellVal !== matchVal;
        case "contains":
          return cellVal.includes(matchVal);
        case "greaterThan": {
          const numCell = Number(cellVal.replace(/[$,%]/g, ""));
          const numMatch = Number(matchVal);
          return !isNaN(numCell) && !isNaN(numMatch) && numCell > numMatch;
        }
        case "lessThan": {
          const numCell = Number(cellVal.replace(/[$,%]/g, ""));
          const numMatch = Number(matchVal);
          return !isNaN(numCell) && !isNaN(numMatch) && numCell < numMatch;
        }
        default:
          return true;
      }
    });
  }
  
  // 2. Group records by selected dimension
  const groups: Record<string, number[]> = {};
  for (const row of filteredRows) {
    const dimVal = row[dimension] === "" ? "(Blank)" : row[dimension];
    
    let metricVal = 0;
    if (aggregation === "count") {
      metricVal = 1;
    } else if (metric) {
      const rawVal = row[metric];
      if (rawVal !== undefined) {
        const cleaned = String(rawVal).replace(/[$,%]/g, "").trim();
        metricVal = cleaned === "" ? 0 : Number(cleaned);
        if (isNaN(metricVal)) metricVal = 0;
      }
    }
    
    if (!groups[dimVal]) {
      groups[dimVal] = [];
    }
    groups[dimVal].push(metricVal);
  }
  
  // 3. Perform aggregate math per bucket
  const result: AggregatedDataPoint[] = Object.keys(groups).map(dimVal => {
    const values = groups[dimVal];
    let computedMetric = 0;
    
    if (aggregation === "count") {
      computedMetric = values.length;
    } else if (values.length > 0) {
      switch (aggregation) {
        case "sum":
          computedMetric = values.reduce((sum, v) => sum + v, 0);
          break;
        case "average":
          computedMetric = values.reduce((sum, v) => sum + v, 0) / values.length;
          break;
        case "min":
          computedMetric = Math.min(...values);
          break;
        case "max":
          computedMetric = Math.max(...values);
          break;
        default:
          computedMetric = 0;
      }
    }
    
    const formattedVal = Number(computedMetric.toFixed(2));
    
    return {
      dimensionValue: dimVal,
      metricValue: formattedVal,
      count: values.length,
      rawMetricValues: values,
      [dimension]: dimVal,
      [metric || "value"]: formattedVal
    };
  });
  
  return result;
}
