import React, { useState, useEffect } from "react";
import { 
  Database, 
  FileSpreadsheet, 
  Sparkles, 
  Filter, 
  Plus, 
  Trash2, 
  BarChart3, 
  PieChart as PieChartIcon, 
  LineChart as LineChartIcon, 
  Table, 
  TrendingUp, 
  RefreshCw, 
  SlidersHorizontal,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Layers,
  ChevronRight,
  Info
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ScatterChart,
  Scatter,
  RadialBarChart,
  RadialBar
} from "recharts";

import { SheetData, ColumnSchema, Suggestion, ReportConfig, ChartType, AggregationType, FilterCondition, AggregatedDataPoint } from "./types";
import { SAMPLE_DATASETS } from "./sampleData";
import { clientParseCSV, aggregateData } from "./utils";
import CbdProcurementDashboard from "./components/CbdProcurementDashboard";

const CHART_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Violet
  '#ef4444', // Red
  '#14b8a6', // Teal
  '#6366f1', // Indigo
  '#f97316'  // Orange
];

export default function App() {
  // Input Google Sheet link or spreadsheet ID
  const [sheetUrlOrId, setSheetUrlOrId] = useState("");
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Sheet Data state
  const [sheetData, setSheetData] = useState<SheetData | null>(null);
  const [columnSchemas, setColumnSchemas] = useState<ColumnSchema[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<Suggestion[]>([]);
  const [aiWarning, setAiWarning] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"visualize" | "raw_data" | "cbd_savings">("visualize");

  // Check if current dataset is specifically a CBD procurement dataset
  const isCbdDataset = sheetData && sheetData.headers.some(h => h.toLowerCase() === "cbd id" || h.toLowerCase() === "cbdid");

  // Automatically switch tabs if a CBD dataset is loaded
  useEffect(() => {
    if (isCbdDataset) {
      setActiveTab("cbd_savings");
    } else {
      setActiveTab("visualize");
    }
  }, [isCbdDataset]);

  // Customized Report Builder states
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    title: "Distribution by Category",
    chartType: "bar",
    dimension: "",
    metric: "",
    aggregation: "count",
    filters: []
  });

  // AI Strategic Insights text state
  const [insightsText, setInsightsText] = useState<string>("");
  const [generatingInsights, setGeneratingInsights] = useState(false);

  // Initialize with First Default Sample on Load
  useEffect(() => {
    loadSampleDataset(0);
  }, []);

  // Whenever dataset or report parameters shift, adjust local aggregated points
  const aggregatedPoints = sheetData ? aggregateData(sheetData.rows, reportConfig) : [];

  // Parse Google Sheet from URL
  const handleImportGoogleSheet = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!sheetUrlOrId.trim()) return;

    setLoadingSheet(true);
    setErrorMsg(null);
    setAiWarning(null);
    
    try {
      const response = await fetch("/api/sheets/parse-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: sheetUrlOrId })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "An internet connection or security issue occurred.");
      }

      const importedSheet: SheetData = {
        spreadsheetId: data.spreadsheetId,
        gid: data.gid,
        headers: data.headers,
        rows: data.rows,
        rowCount: data.rowCount,
        colCount: data.colCount
      };

      setSheetData(importedSheet);
      
      // Auto-analyze headers and suggest dimensions using Gemini API
      await triggerDatasetIntelligence(importedSheet);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to load Google Sheet. Ensure the spreadsheet is shared with 'Anyone with the link can view' access.");
    } finally {
      setLoadingSheet(false);
    }
  };

  // Helper to load sample CSV dataset directly
  const loadSampleDataset = async (sampleIndex: number) => {
    setLoadingSheet(true);
    setErrorMsg(null);
    setAiWarning(null);
    setInsightsText("");
    
    try {
      const sample = SAMPLE_DATASETS[sampleIndex];
      const parsed = clientParseCSV(sample.rawCSV);
      
      const importedSheet: SheetData = {
        headers: parsed.headers,
        rows: parsed.rows,
        rowCount: parsed.rows.length,
        colCount: parsed.headers.length
      };

      setSheetData(importedSheet);
      
      // Auto-analyze sample headers using backend Gemini configuration
      await triggerDatasetIntelligence(importedSheet);
    } catch (err: any) {
      setErrorMsg("Error parsing sample: " + err.message);
    } finally {
      setLoadingSheet(false);
    }
  };

  // Call server-side Gemini to analyze headers and give business dashboard suggestions
  const triggerDatasetIntelligence = async (sheet: SheetData) => {
    try {
      const sampleRows = sheet.rows.slice(0, 5);
      const response = await fetch("/api/analyze-columns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headers: sheet.headers,
          sampleRows
        })
      });

      if (!response.ok) throw new Error("Server analysis was non-responsive.");
      
      const parsedIntel = await response.json();
      
      if (parsedIntel.columns) {
        setColumnSchemas(parsedIntel.columns);
      }
      if (parsedIntel.suggestions) {
        setAiSuggestions(parsedIntel.suggestions);
        
        // Auto-apply the first suggestion as the starter configuration!
        const firstSug = parsedIntel.suggestions[0];
        if (firstSug) {
          applySuggestion(firstSug);
        }
      }
      if (parsedIntel.warning) {
        setAiWarning(parsedIntel.warning);
      }
    } catch (err: any) {
      console.warn("Dataset Intelligence loading issue:", err);
      // Fallback schemas
      const fallbackSchemas: ColumnSchema[] = sheet.headers.map(h => {
        const isNumeric = sheet.rows.slice(0, 20).some(r => {
          const clean = String(r[h]).replace(/[$,%]/g, "").trim();
          return clean !== "" && !isNaN(Number(clean));
        });
        return {
          name: h,
          type: isNumeric ? "numerical" : "categorical",
          description: `Column representing ${h}`
        };
      });
      setColumnSchemas(fallbackSchemas);
      
      const numerical = fallbackSchemas.filter(c => c.type === "numerical").map(c => c.name);
      const categorical = fallbackSchemas.filter(c => c.type === "categorical").map(c => c.name);
      
      const defaultMeasure = numerical[0] || sheet.headers[sheet.headers.length - 1] || sheet.headers[0];
      const defaultDim = categorical[0] || sheet.headers[0];

      const fallbackSuggestions: Suggestion[] = [
        {
          title: `Distribution of Records by ${defaultDim}`,
          description: `Analyze item counts across grouped segments in ${defaultDim}`,
          chartType: "bar",
          dimension: defaultDim,
          metric: defaultMeasure,
          aggregation: "count"
        }
      ];
      setAiSuggestions(fallbackSuggestions);
      applySuggestion(fallbackSuggestions[0]);
    }
  };

  // Apply suggested report setup with one click
  const applySuggestion = (sug: Suggestion) => {
    setReportConfig({
      title: sug.title,
      chartType: sug.chartType,
      dimension: sug.dimension,
      metric: sug.metric,
      aggregation: sug.aggregation,
      filters: []
    });
    setInsightsText("");
  };

  // Trigger Gemini executive analysis for active viz aggregatedPoints
  const handleGenerateInsights = async () => {
    if (!sheetData || aggregatedPoints.length === 0) return;
    
    setGeneratingInsights(true);
    setInsightsText("");
    
    try {
      const response = await fetch("/api/generate-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chartTitle: reportConfig.title,
          dimensionName: reportConfig.dimension,
          metricName: reportConfig.metric,
          aggregationType: reportConfig.aggregation,
          aggregatedData: aggregatedPoints,
          columnDescriptions: columnSchemas.reduce((acc, c) => {
            acc[c.name] = c.description;
            return acc;
          }, {} as Record<string, string>)
        })
      });

      const parsedInsight = await response.json();
      setInsightsText(parsedInsight.summary || "No insights draft received.");
    } catch (err: any) {
      console.error(err);
      setInsightsText("### AI Insight Summary\n\n- Dataset aggregated successfully. Strategic narrative connection experienced an offset. Review chart visual correlations above directly!");
    } finally {
      setGeneratingInsights(false);
    }
  };

  // Add filters conditions
  const handleAddFilter = () => {
    if (!sheetData || sheetData.headers.length === 0) return;
    const defaultCol = sheetData.headers[0];
    const newFilter: FilterCondition = {
      column: defaultCol,
      operator: "equals",
      value: ""
    };
    setReportConfig({
      ...reportConfig,
      filters: [...reportConfig.filters, newFilter]
    });
    setInsightsText("");
  };

  // Remove filter condition
  const handleRemoveFilter = (index: number) => {
    const updatedFilters = [...reportConfig.filters];
    updatedFilters.splice(index, 1);
    setReportConfig({
      ...reportConfig,
      filters: updatedFilters
    });
    setInsightsText("");
  };

  // Update specific filter property
  const handleUpdateFilter = (index: number, key: keyof FilterCondition, value: string) => {
    const updatedFilters = [...reportConfig.filters];
    updatedFilters[index] = {
      ...updatedFilters[index],
      [key]: value
    };
    setReportConfig({
      ...reportConfig,
      filters: updatedFilters
    });
    setInsightsText("");
  };

  // Get dynamic unique value listing for easy dropdown filter options
  const getUniqueValuesForColumn = (columnName: string) => {
    if (!sheetData) return [];
    const values = sheetData.rows.map(r => String(r[columnName])).filter(v => v !== undefined && v !== "");
    return Array.from(new Set(values)).sort();
  };

  // Help determine visual configurations
  const numColumns = columnSchemas.filter(c => c.type === "numerical").map(c => c.name);
  const catColumns = columnSchemas.map(c => c.name);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col antialiased font-sans">
      {/* Dynamic Alert Banner */}
      {aiWarning && (
        <div id="ai-warning-banner" className="bg-amber-50 border-b border-amber-200 py-2.5 px-4 text-xs text-amber-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>{aiWarning}</span>
          </div>
          <button onClick={() => setAiWarning(null)} className="font-semibold text-amber-950 hover:underline">Dismiss</button>
        </div>
      )}

      {/* Corporate Header Nav */}
      <header id="app-main-header" className="bg-white border-b border-slate-200 py-4 px-6 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-md flex items-center justify-center text-white font-bold text-lg shadow-sm">
              Σ
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-950 tracking-tight flex items-center gap-2">
                SheetSight<span className="text-indigo-600">Pro</span>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-semibold border border-indigo-150">
                  Live BI
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Report, group, and slice Google Sheets automatically using multidimensional visual analytics</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <span className="text-xs text-slate-400 hidden sm:inline font-medium">Switch Test Source:</span>
            <div className="flex gap-1.5 flex-wrap">
              {SAMPLE_DATASETS.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => loadSampleDataset(idx)}
                  className={`bg-white hover:bg-slate-50 text-slate-700 text-xs py-1.5 px-2.5 rounded border font-semibold transition flex items-center gap-1 active:scale-95 shadow-2xs cursor-pointer ${
                    sheetData && sheetData.headers.join(',') === SAMPLE_DATASETS[idx].rawCSV.split('\n')[0] ? "border-indigo-500 bg-indigo-50/20 text-indigo-700" : "border-slate-200"
                  }`}
                >
                  <Database className="w-3.5 h-3.5 text-indigo-600" />
                  {idx === 0 ? "Enterprise Sales" : idx === 1 ? "SaaS Signup" : idx === 2 ? "Project Spend" : "CBD Sourcing"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container Area */}
      <main id="app-workspace" className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Data Connection & BI Builder Configuration */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Section A: Input Google Sheet link */}
          <div id="google-sheet-portal" className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
              1. Spreadsheet Connection
            </h2>
            <form onSubmit={handleImportGoogleSheet} className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Paste URL (with View permissions)..."
                  value={sheetUrlOrId}
                  onChange={(e) => setSheetUrlOrId(e.target.value)}
                  className="w-full pl-3 pr-24 py-2 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800 transition"
                />
                <div className="absolute right-2 top-2.5 flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 select-none">
                  <button
                    type="button"
                    onClick={() => setSheetUrlOrId("https://docs.google.com/spreadsheets/d/1oHAYnC2pQ9AbmECZmrSPtgDZsW0i-nxe5uKLQkzC6nA/edit?usp=sharing")}
                    title="Load original CBD procurement and supplier savings spreadsheet directly"
                    className="hover:underline cursor-pointer"
                  >
                    Load CBD Sheet
                  </button>
                </div>
              </div>
              
              <div className="bg-slate-50 p-3 rounded border border-slate-200 text-[11px] text-slate-500 leading-relaxed">
                <div className="flex gap-1.5 items-start">
                  <Info className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-700">Access Rule:</span> The sheet sharing option must be configured as <span className="font-semibold text-indigo-600">\"Anyone with the link can view\"</span> so the proxy retrieves rows instantly.
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                  <span className="leading-normal">{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loadingSheet || !sheetUrlOrId}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-xs py-2 px-4 rounded transition shadow-xs flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
              >
                {loadingSheet ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Connecting Workspace...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Synchronize & Analyze
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Section B: Model Columns Schema Overview */}
          {sheetData && (
            <div id="dataset-schema-analytics" className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col max-h-[300px]">
              <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  Column Dimensions ({sheetData.colCount})
                </h3>
                <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 py-0.5 px-2 rounded-sm font-semibold">
                  {sheetData.rowCount} rows
                </span>
              </div>
              
              <div className="overflow-y-auto space-y-2 flex-1 pr-1.5">
                {columnSchemas.map((col, idx) => (
                  <div key={idx} className="p-2 bg-slate-50 border border-slate-200 rounded flex flex-col gap-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 break-all">{col.name}</span>
                      <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded-sm font-mono font-bold ${
                        col.type === "numerical" ? "bg-indigo-50 text-indigo-700 border border-indigo-200" :
                        col.type === "temporal" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                        col.type === "categorical" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                        "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}>
                        {col.type}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 leading-normal">{col.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section C: report builder Parameters Setup */}
          {sheetData && (
            <div id="dynamic-report-builder" className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                2. Dimensional Reporter config
              </h3>

              {/* Title input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 block">Report Title</label>
                <input
                  type="text"
                  value={reportConfig.title}
                  onChange={(e) => setReportConfig({ ...reportConfig, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              {/* Group dimension selector (X Axis) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 flex items-center justify-between">
                  <span>Grouping Dimension (X-Axis)</span>
                  <span className="text-[9px] text-indigo-600 font-mono">Categorical / Date</span>
                </label>
                <select
                  value={reportConfig.dimension}
                  onChange={(e) => setReportConfig({ ...reportConfig, dimension: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="" disabled>-- Choose Dimension --</option>
                  {catColumns.map((col, i) => (
                    <option key={i} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              {/* Quantitative metric selector (Y Axis) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 flex items-center justify-between">
                  <span>Measure Metric (Y-Axis)</span>
                  <span className="text-[9px] text-indigo-600 font-mono">Numerical Value</span>
                </label>
                <select
                  value={reportConfig.metric}
                  disabled={reportConfig.aggregation === "count"}
                  onChange={(e) => setReportConfig({ ...reportConfig, metric: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium disabled:opacity-50 disabled:bg-slate-100"
                >
                  <option value="">-- Choose Metric Column --</option>
                  {numColumns.map((col, i) => (
                    <option key={i} value={col}>{col}</option>
                  ))}
                  {numColumns.length === 0 && catColumns.map((col, i) => (
                    <option key={i} value={col}>{col} (Text column)</option>
                  ))}
                </select>
              </div>

              {/* Aggregation method choice */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 flex items-center justify-between">
                  <span>Aggregate Function</span>
                </label>
                <div className="grid grid-cols-5 gap-1">
                  {(["sum", "average", "count", "min", "max"] as AggregationType[]).map((func) => (
                    <button
                      key={func}
                      type="button"
                      onClick={() => {
                        const nextMetric = func === "count" ? "" : (reportConfig.metric || numColumns[0] || "");
                        setReportConfig({
                          ...reportConfig,
                          aggregation: func,
                          metric: nextMetric
                        });
                        setInsightsText("");
                      }}
                      className={`text-[10px] py-1 font-bold rounded border text-center transition capitalize cursor-pointer ${
                        reportConfig.aggregation === func
                          ? "bg-indigo-50 text-indigo-700 border-indigo-300 ring-1 ring-indigo-200"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {func === "average" ? "Avg" : func}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visual chart visual model choice */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Chart Visualization View</label>
                <div className="grid grid-cols-4 gap-1">
                  {([
                    { name: "Bar", type: "bar", icon: BarChart3 },
                    { name: "Line", type: "line", icon: LineChartIcon },
                    { name: "Area", type: "area", icon: LineChartIcon },
                    { name: "Pie", type: "pie", icon: PieChartIcon },
                    { name: "Table", type: "table", icon: Table }
                  ] as { name: string; type: ChartType; icon: any }[]).map((chart) => (
                    <button
                      key={chart.type}
                      type="button"
                      onClick={() => {
                        setReportConfig({ ...reportConfig, chartType: chart.type });
                        setInsightsText("");
                      }}
                      className={`py-1.5 px-1 font-bold rounded border flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                        reportConfig.chartType === chart.type
                          ? "bg-indigo-50 text-indigo-700 border-indigo-300 ring-1 ring-indigo-200"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      <chart.icon className="w-4 h-4" />
                      <span className="text-[10px]">{chart.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Interactive Viz Preview, Filters, and Executive narrative */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {sheetData ? (
            <>
              {/* AI Auto-Discovered Dashboard Suggestions Room */}
              {aiSuggestions.length > 0 && (
                <div id="ai-dashboard-presets" className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
                    <h3 className="text-slate-900 font-bold text-xs uppercase tracking-wider">
                      AI Live Dashboard Recommendations 
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {aiSuggestions.slice(0, 4).map((sug, i) => (
                      <button
                        key={i}
                        onClick={() => applySuggestion(sug)}
                        className="bg-slate-50 hover:bg-indigo-50/40 hover:border-indigo-200 border border-slate-200 rounded p-3 text-left transition flex gap-3 h-full group active:scale-98 cursor-pointer"
                      >
                        <div className="bg-indigo-100 p-2 rounded text-indigo-700 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                          {sug.chartType === "pie" ? <PieChartIcon className="w-4 h-4" /> : <BarChart3 className="w-4 h-4" />}
                        </div>
                        <div className="space-y-0.5 text-xs">
                          <h4 className="font-semibold text-slate-800 line-clamp-1">{sug.title}</h4>
                          <p className="text-[10px] text-slate-500 line-clamp-2 leading-normal">{sug.description}</p>
                          <div className="flex items-center gap-1.5 pt-1 text-[9px] font-mono font-bold text-indigo-700">
                            <span>Dim: {sug.dimension}</span>
                            <span>•</span>
                            <span>{sug.aggregation.toUpperCase()}({sug.metric || "Count"})</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* Top KPI Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dataset Extracted Rows</p>
                  <p className="text-xl font-black mt-1 text-slate-900">{sheetData.rowCount.toLocaleString()}</p>
                  <p className="text-[10px] text-emerald-600 mt-2 font-bold">● Active sync channel verified</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Segments Stack</p>
                  <p className="text-xl font-black mt-1 text-slate-900">{aggregatedPoints.length} partitions</p>
                  <div className="w-full bg-slate-100 h-1 rounded-full mt-3">
                    <div className="bg-indigo-600 h-1 rounded-full" style={{ width: `${Math.min(100, Math.max(10, (aggregatedPoints.length / sheetData.rowCount) * 100))}%` }}></div>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Structural Integrity</p>
                  <p className="text-xl font-black mt-1 text-indigo-600">100% Valid</p>
                  <p className="text-[10px] text-slate-400 mt-2 font-medium">{sheetData.colCount} validated dimension vectors</p>
                </div>
              </div>

              {/* Main Report Viz Preview Frame */}
              <div id="report-view-canvas" className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col min-h-[500px]">
                
                {/* Navbar within Card */}
                <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {isCbdDataset && (
                      <button
                        onClick={() => setActiveTab("cbd_savings")}
                        className={`text-xs font-bold pb-1 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                          activeTab === "cbd_savings"
                            ? "text-indigo-600 border-indigo-600 font-extrabold"
                            : "text-slate-500 border-transparent hover:text-slate-800"
                        }`}
                      >
                        💼 CBD & Supplier Sourcing Deep-Dive
                      </button>
                    )}
                    <button
                      onClick={() => setActiveTab("visualize")}
                      className={`text-xs font-bold pb-1 border-b-2 transition cursor-pointer ${
                        activeTab === "visualize"
                          ? "text-indigo-600 border-indigo-600"
                          : "text-slate-500 border-transparent hover:text-slate-800"
                      }`}
                    >
                      Visualization Board
                    </button>
                    <button
                      onClick={() => setActiveTab("raw_data")}
                      className={`text-xs font-bold pb-1 border-b-2 transition cursor-pointer ${
                        activeTab === "raw_data"
                          ? "text-indigo-600 border-indigo-600"
                          : "text-slate-500 border-transparent hover:text-slate-800"
                      }`}
                    >
                      Browse Raw Records
                    </button>
                  </div>

                  <div className="text-[11px] text-slate-500 bg-white py-1 px-3 border border-slate-200 rounded">
                    <span>Aggregated Result: </span>
                    <strong className="text-slate-800 font-extrabold">{aggregatedPoints.length} segments</strong>
                  </div>
                </div>

                {/* Tab content switcher */}
                {activeTab === "cbd_savings" && isCbdDataset ? (
                  <div className="p-5 flex-1 flex flex-col gap-6 bg-slate-50/20">
                    <CbdProcurementDashboard sheetData={sheetData} />
                  </div>
                ) : activeTab === "visualize" ? (
                  <div className="p-5 flex-1 flex flex-col gap-5">
                    
                    {/* Visual filter condition row configuration */}
                    <div id="filters-accordion" className="bg-slate-50 border border-slate-200 p-4 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                          <Filter className="w-3.5 h-3.5 text-indigo-500" />
                          Apply Group Filters ({reportConfig.filters.length})
                        </span>
                        <button
                          onClick={handleAddFilter}
                          className="text-[10px] bg-indigo-600 text-white font-bold py-1 px-2.5 rounded hover:bg-indigo-700 transition flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Add filter rule
                        </button>
                      </div>

                      {reportConfig.filters.length === 0 ? (
                        <p className="text-[11px] text-slate-400 font-medium">No filter conditions applied. Presenting all row records in-memory.</p>
                      ) : (
                        <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                          {reportConfig.filters.map((filter, idx) => (
                            <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 bg-white p-2 border border-slate-200 rounded shadow-2xs">
                              {/* Column chosen */}
                              <select
                                value={filter.column}
                                onChange={(e) => handleUpdateFilter(idx, "column", e.target.value)}
                                className="bg-slate-50 border border-slate-200 text-xs rounded p-1 font-semibold text-slate-700 focus:outline-hidden"
                              >
                                {sheetData.headers.map((h, i) => (
                                  <option key={i} value={h}>{h}</option>
                                ))}
                              </select>

                              {/* Operator chosen */}
                              <select
                                value={filter.operator}
                                onChange={(e) => handleUpdateFilter(idx, "operator", e.target.value as any)}
                                className="bg-slate-50 border border-slate-200 text-xs rounded p-1 text-slate-700 focus:outline-hidden"
                              >
                                <option value="equals">equals</option>
                                <option value="notEquals">is not equal to</option>
                                <option value="contains">contains</option>
                                <option value="greaterThan">is greater than (&gt;)</option>
                                <option value="lessThan">is less than (&lt;)</option>
                              </select>

                              {/* Target value input or dropdown of unique entries */}
                              <div className="flex-1 min-w-[120px]">
                                <input
                                  type="text"
                                  placeholder="Match text or value..."
                                  value={filter.value}
                                  onChange={(e) => handleUpdateFilter(idx, "value", e.target.value)}
                                  list={`filter-datalist-${idx}`}
                                  className="w-full bg-slate-50 border border-slate-200 text-xs rounded px-2 py-1 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-semibold"
                                />
                                <datalist id={`filter-datalist-${idx}`}>
                                  {getUniqueValuesForColumn(filter.column).map((u, k) => (
                                    <option key={k} value={u} />
                                  ))}
                                </datalist>
                              </div>

                              <button
                                onClick={() => handleRemoveFilter(idx)}
                                title="Delete filter rule"
                                className="text-rose-500 hover:text-rose-700 p-1 rounded bg-stone-50 hover:bg-rose-55 border border-transparent hover:border-rose-100 transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Chart visual display frame */}
                    <div id="recharts-visualizer" className="flex-1 min-h-[320px] bg-slate-50 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-4">
                      {reportConfig.dimension ? (
                        aggregatedPoints.length > 0 ? (
                          <div className="w-full h-full min-h-[300px] flex flex-col gap-2">
                            <h4 className="text-center font-bold text-slate-800 text-sm tracking-tight pt-1">
                              {reportConfig.title || "Custom Visualization Report"}
                            </h4>
                            <div className="flex-1 min-h-[260px] relative">
                              <ResponsiveContainer width="100%" height="100%">
                                {reportConfig.chartType === "bar" ? (
                                  <BarChart data={aggregatedPoints} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="dimensionValue" stroke="#64748b" fontSize={11} tickLine={false} />
                                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                                    <ChartTooltip cursor={{ fill: '#f1f5f9' }} />
                                    <Legend wrapperStyle={{ fontSize: 11 }} />
                                    <Bar name={`${reportConfig.aggregation.toUpperCase()}(${reportConfig.metric || "Count"})`} dataKey="metricValue" fill="#4f46e5" radius={[4, 4, 0, 0]}>
                                      {aggregatedPoints.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                      ))}
                                    </Bar>
                                  </BarChart>
                                ) : reportConfig.chartType === "line" ? (
                                  <LineChart data={aggregatedPoints} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="dimensionValue" stroke="#64748b" fontSize={11} tickLine={false} />
                                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                                    <ChartTooltip />
                                    <Legend wrapperStyle={{ fontSize: 11 }} />
                                    <Line name={`${reportConfig.aggregation.toUpperCase()}(${reportConfig.metric || "Count"})`} type="monotone" dataKey="metricValue" stroke="#4f46e5" strokeWidth={2.5} activeDot={{ r: 6 }} />
                                  </LineChart>
                                ) : reportConfig.chartType === "area" ? (
                                  <AreaChart data={aggregatedPoints} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="dimensionValue" stroke="#64748b" fontSize={11} tickLine={false} />
                                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                                    <ChartTooltip />
                                    <Legend wrapperStyle={{ fontSize: 11 }} />
                                    <Area name={`${reportConfig.aggregation.toUpperCase()}(${reportConfig.metric || "Count"})`} type="monotone" dataKey="metricValue" stroke="#4f46e5" fill="#e0e7ff" fillOpacity={0.6} />
                                  </AreaChart>
                                ) : reportConfig.chartType === "pie" ? (
                                  <PieChart>
                                    <ChartTooltip />
                                    <Legend wrapperStyle={{ fontSize: 11 }} />
                                    <Pie
                                      data={aggregatedPoints}
                                      cx="50%"
                                      cy="45%"
                                      innerRadius={60}
                                      outerRadius={90}
                                      paddingAngle={2}
                                      dataKey="metricValue"
                                      nameKey="dimensionValue"
                                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                    >
                                      {aggregatedPoints.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                      ))}
                                    </Pie>
                                  </PieChart>
                                ) : (
                                  // Fallback table aggregates list
                                  <div className="flex items-center justify-center h-full">
                                    <div className="text-[11px] text-slate-400">Rechart unsupported dimension render model selected.</div>
                                  </div>
                                )}
                              </ResponsiveContainer>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-xs text-slate-400">
                            No row records found matching the active filter properties list. Change metrics target parameters to preview!
                          </div>
                        )
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-center text-slate-400 max-w-sm">
                          <HelpCircle className="w-8 h-8 text-slate-300" />
                          <h4 className="text-xs font-semibold text-slate-700">No Dimension Configured</h4>
                          <p className="text-[11px] leading-normal">
                            Select a grouping column on the left or click any of the AI live recommendations to instantly initialize your dynamic visualization board!
                          </p>
                        </div>
                      )}
                    </div>

                    {/* AI Insights & Actions Generator */}
                    {reportConfig.dimension && aggregatedPoints.length > 0 && (
                      <div id="insights-narration" className="border border-slate-200 rounded-xl p-4 space-y-4 bg-gradient-to-br from-indigo-50/60 to-slate-200/5 hover:border-indigo-300/80 transition">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className="bg-indigo-100 p-1.5 rounded text-indigo-700">
                              <Sparkles className="w-4 h-4 animate-spin-slow" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-800">Gemini Strategic Executive insights</h4>
                              <p className="text-[10px] text-slate-500 mt-0.5">Analyst perspective on active slices and dynamic filters</p>
                            </div>
                          </div>
                          <button
                            onClick={handleGenerateInsights}
                            disabled={generatingInsights}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-1.5 px-3.5 rounded transition shadow-xs flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                          >
                            <TrendingUp className="w-3.5 h-3.5" />
                            {generatingInsights ? "Computing Narrative..." : "Draft Executive Narrative"}
                          </button>
                        </div>

                        {generatingInsights ? (
                          <div className="py-8 flex flex-col items-center justify-center gap-2 bg-white/70 rounded-xl border border-slate-100">
                            <div className="relative">
                              <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                              <Sparkles className="w-3 h-3 text-indigo-600 absolute inset-0 m-auto" />
                            </div>
                            <span className="text-[11px] text-slate-400 font-semibold">Gemini model drafting analysis...</span>
                          </div>
                        ) : insightsText ? (
                          <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs leading-relaxed text-slate-700 overflow-y-auto max-h-[300px] prose prose-slate">
                            {/* Render basic custom styled Markdown list and fields */}
                            <div className="space-y-2">
                              {insightsText.split("\n").map((line, lIndex) => {
                                if (line.startsWith("###")) {
                                  return <h4 key={lIndex} className="font-bold text-slate-900 text-xs border-b border-slate-100 pb-1.5 mt-3">{line.replace("###", "").trim()}</h4>;
                                }
                                if (line.startsWith("**")) {
                                  return <p key={lIndex} className="font-medium text-slate-800 my-1">{line}</p>;
                                }
                                if (line.startsWith("-") || line.startsWith("*")) {
                                  return (
                                    <div key={lIndex} className="flex gap-2 items-start mt-1 text-[11px] ml-1">
                                      <span className="text-indigo-600 font-bold">•</span>
                                      <span>{line.substring(1).trim()}</span>
                                    </div>
                                  );
                                }
                                return line.trim() ? <p key={lIndex} className="my-1.5 text-slate-600">{line}</p> : null;
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-6 bg-white/45 border border-dashed border-slate-200 rounded-xl text-[11px] text-slate-400">
                            Click the draft execute button to compose executive KPI narratives and corporate strategic solutions based on this active group query!
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                ) : (
                  // Raw data table viewer
                  <div className="p-5 flex-1 flex flex-col gap-3">
                    <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        Full spreadsheet columns are exposed in desired dimensions below.
                      </span>
                      <span>Showing first {Math.min(sheetData.rows.length, 50)} rows</span>
                    </div>

                    <div className="flex-1 overflow-x-auto border border-slate-200 rounded-xl bg-white max-h-[460px]">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="sticky top-0 bg-slate-100 font-semibold text-slate-700 shadow-2xs">
                          <tr>
                            <th className="py-2.5 px-3 border-b border-slate-200 w-12 text-center">Row</th>
                            {sheetData.headers.map((h, i) => (
                              <th key={i} className="py-2.5 px-3 border-b border-slate-200 font-medium whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {sheetData.rows.map((rowArr, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-50/70 transition">
                              <td className="py-2 px-3 text-slate-400 font-mono text-[10px] bg-slate-50 text-center border-r border-slate-100">
                                {rowArr.__id || rIdx + 1}
                              </td>
                              {sheetData.headers.map((h, cIdx) => (
                                <td key={cIdx} className="py-2 px-3 text-slate-600 font-mono text-[11px] max-w-[200px] truncate" title={rowArr[h]}>
                                  {rowArr[h]}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              </div>
            </>
          ) : (
            // Empty State loading animation
            <div id="full-workspace-loader" className="bg-white rounded-xl border border-slate-200 shadow-xs flex-1 flex flex-col items-center justify-center p-12 min-h-[600px] text-center">
              <div className="relative mb-4">
                <div className="w-12 h-12 border-4 border-indigo-150 border-t-indigo-600 rounded-full animate-spin"></div>
                <FileSpreadsheet className="w-5 h-5 text-indigo-600 absolute inset-0 m-auto" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Organizing Spreadsheet Workspaces...</h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1 leading-normal">
                Connecting schemas, deploying core metrics analyzers, and executing column classifications for your custom visual reports. Please hold...
              </p>
            </div>
          )}

        </div>

      </main>

      {/* Corporate Compact Footer */}
      <footer id="app-footer-bar" className="bg-white border-t border-slate-200 mt-12 py-5 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-3">
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-slate-400" />
            <span>SheetSight Pro Multidimensional Intelligence Engine • Built with React, Vite & Gemini 3.5 API</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Server Proxy Active</span>
            <span>•</span>
            <span>Local timezone: {new Date().toLocaleDateString(undefined, { timeZoneName: "short" })}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
