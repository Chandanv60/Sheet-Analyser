import React, { useState, useMemo } from "react";
import { 
  DollarSign, 
  Layers, 
  TrendingUp, 
  Search, 
  Building2, 
  SlidersHorizontal, 
  Briefcase, 
  MapPin, 
  HelpCircle,
  Menu,
  ChevronDown,
  Info,
  Calendar,
  Box,
  CornerDownRight,
  ShieldCheck,
  CheckCircle,
  FileSpreadsheet,
  Download,
  Cpu
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie
} from "recharts";
import { SheetData } from "../types";

interface CbdProcurementDashboardProps {
  sheetData: SheetData;
}

const CHART_COLORS = [
  '#4f46e5', // Indigo-600
  '#06b6d4', // Cyan-500
  '#10b981', // Emerald-500
  '#f59e0b', // Amber-500
  '#ec4899', // Pink-500
  '#8b5cf6', // Violet-500
  '#ef4444', // Red-500
  '#14b8a6', // Teal-500
  '#f97316'  // Orange-500
];

export default function CbdProcurementDashboard({ sheetData }: CbdProcurementDashboardProps) {
  const { rows, headers } = sheetData;

  // Primary navigation sub-tabs
  const [currentTab, setCurrentTab] = useState<"vendors" | "cbds" | "processes">("vendors");

  // Selection states
  const [selectedCbdId, setSelectedCbdId] = useState<string>("");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [selectedProcessSection, setSelectedProcessSection] = useState<string>("");

  // Search input states
  const [cbdSearchQuery, setCbdSearchQuery] = useState("");
  const [supplierSearchQuery, setSupplierSearchQuery] = useState("");
  const [processSearchQuery, setProcessSearchQuery] = useState("");

  // Interactive local states
  const [supplierType, setSupplierType] = useState<"fg_supplier" | "component_supplier">("fg_supplier");

  // Helper: robust number parsing
  const parseNum = (val: string | number | undefined): number => {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return val;
    const clean = String(val).replace(/[$,%\s]/g, "").trim();
    const num = Number(clean);
    return isNaN(num) ? 0 : num;
  };

  // Identify available key columns dynamically
  const cbdIdCol = headers.find(h => h.toLowerCase() === "cbd id" || h.toLowerCase() === "cbdid") || "CBD ID";
  const cbdStatusCol = headers.find(h => h.toLowerCase() === "cbd status" || h.toLowerCase() === "status") || "CBD status";
  const fgSupplierCol = headers.find(h => h.toLowerCase() === "fg supplier" || h.toLowerCase() === "supplier") || "FG supplier";
  const compSupplierCol = headers.find(h => h.toLowerCase().includes("component supplier")) || "component supplier";
  const gapCol = headers.find(h => h.toLowerCase() === "gap $" || h.toLowerCase() === "gap") || "Gap $";
  const totalGapCol = headers.find(h => h.toLowerCase() === "total gap $" || h.toLowerCase() === "total gap") || "Total Gap $";
  const qtyCol = headers.find(h => h.toLowerCase() === "quantity" || h.toLowerCase() === "qty") || "Quantity";
  const designationCol = headers.find(h => h.toLowerCase() === "designation" || h.toLowerCase() === "description") || "designation";
  const countryCol = headers.find(h => h.toLowerCase() === "country_name" || h.toLowerCase() === "country") || "country_name";
  const seasonCol = headers.find(h => h.toLowerCase() === "season") || "Season";
  const codeCol = headers.find(h => h.toLowerCase() === "item_code" || h.toLowerCase() === "dsm_code") || "item_code";
  const sectionCol = headers.find(h => h.toLowerCase() === "section" || h.toLowerCase() === "process" || h.toLowerCase() === "department") || "section";

  // ==========================================
  // 1. STATISTIC METRICS SUMMARY (KPIs)
  // ==========================================
  const cbdStats = useMemo(() => {
    const uniqueCbds = new Set<string>();
    const statusCounts: Record<string, number> = {};
    const fgSupplierUnique = new Set<string>();
    const compSupplierUnique = new Set<string>();
    const processSectionsUnique = new Set<string>();
    
    let totalSavingsPot = 0;
    let totalItems = 0;
    
    rows.forEach(r => {
      const cbdId = String(r[cbdIdCol] || "").trim();
      if (cbdId) {
        uniqueCbds.add(cbdId);
        
        const status = String(r[cbdStatusCol] || "Unknown").trim();
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      }
      
      const fgSupplier = String(r[fgSupplierCol] || "").trim();
      if (fgSupplier) fgSupplierUnique.add(fgSupplier);

      const compSupplier = String(r[compSupplierCol] || "").trim();
      if (compSupplier) compSupplierUnique.add(compSupplier);

      const sectionVal = String(r[sectionCol] || "").trim();
      if (sectionVal) processSectionsUnique.add(sectionVal);
      
      totalSavingsPot += parseNum(r[totalGapCol]);
      totalItems += 1;
    });

    const statusArray = Object.keys(statusCounts).map(status => ({
      name: status,
      value: statusCounts[status]
    }));

    return {
      cbdCount: uniqueCbds.size,
      allCbdsList: Array.from(uniqueCbds),
      totalSavings: totalSavingsPot,
      fgSupplierCount: fgSupplierUnique.size,
      compSupplierCount: compSupplierUnique.size,
      processSectionsCount: processSectionsUnique.size,
      statusBreakdown: statusArray,
      totalItems
    };
  }, [rows, cbdIdCol, cbdStatusCol, fgSupplierCol, compSupplierCol, sectionCol, totalGapCol]);

  // ==========================================
  // 2. FULL AGGREGATES FOR CSV EXTRACTION
  // ==========================================

  // FG Supplier Fully Aggregated
  const fgSupplierSavingsFull = useMemo(() => {
    const aggregates: Record<string, { 
      supplier: string; 
      savingsPot: number; 
      itemsCount: number; 
      totalQty: number;
      cbds: Set<string>;
    }> = {};

    rows.forEach(r => {
      const supplierName = String(r[fgSupplierCol] || "(Blank/Unknown)").trim();
      const gapSavings = parseNum(r[totalGapCol]);
      const qtyVal = parseNum(r[qtyCol]);
      const cbdId = String(r[cbdIdCol] || "").trim();

      if (!aggregates[supplierName]) {
        aggregates[supplierName] = {
          supplier: supplierName,
          savingsPot: 0,
          itemsCount: 0,
          totalQty: 0,
          cbds: new Set()
        };
      }

      aggregates[supplierName].savingsPot += gapSavings;
      aggregates[supplierName].itemsCount += 1;
      aggregates[supplierName].totalQty += qtyVal;
      if (cbdId) {
        aggregates[supplierName].cbds.add(cbdId);
      }
    });

    return Object.values(aggregates).map(item => ({
      supplierName: item.supplier,
      uniqueCbdsCount: item.cbds.size,
      itemsCount: item.itemsCount,
      totalQty: item.totalQty,
      totalSavings: Number(item.savingsPot.toFixed(2)),
      avgGap: item.itemsCount > 0 ? Number((item.savingsPot / item.itemsCount).toFixed(2)) : 0
    })).sort((a, b) => b.totalSavings - a.totalSavings);
  }, [rows, fgSupplierCol, totalGapCol, qtyCol, cbdIdCol]);

  // Component Supplier Fully Aggregated
  const compSupplierSavingsFull = useMemo(() => {
    const aggregates: Record<string, { 
      supplier: string; 
      savingsPot: number; 
      itemsCount: number; 
      totalQty: number;
      cbds: Set<string>;
    }> = {};

    rows.forEach(r => {
      const supplierName = String(r[compSupplierCol] || "(Blank/Unknown)").trim();
      const gapSavings = parseNum(r[totalGapCol]);
      const qtyVal = parseNum(r[qtyCol]);
      const cbdId = String(r[cbdIdCol] || "").trim();

      if (!aggregates[supplierName]) {
        aggregates[supplierName] = {
          supplier: supplierName,
          savingsPot: 0,
          itemsCount: 0,
          totalQty: 0,
          cbds: new Set()
        };
      }

      aggregates[supplierName].savingsPot += gapSavings;
      aggregates[supplierName].itemsCount += 1;
      aggregates[supplierName].totalQty += qtyVal;
      if (cbdId) {
        aggregates[supplierName].cbds.add(cbdId);
      }
    });

    return Object.values(aggregates).map(item => ({
      supplierName: item.supplier,
      uniqueCbdsCount: item.cbds.size,
      itemsCount: item.itemsCount,
      totalQty: item.totalQty,
      totalSavings: Number(item.savingsPot.toFixed(2)),
      avgGap: item.itemsCount > 0 ? Number((item.savingsPot / item.itemsCount).toFixed(2)) : 0
    })).sort((a, b) => b.totalSavings - a.totalSavings);
  }, [rows, compSupplierCol, totalGapCol, qtyCol, cbdIdCol]);

  // Active view supplier savings (based on selected toggle)
  const activeSupplierSavingsList = useMemo(() => {
    return supplierType === "fg_supplier" ? fgSupplierSavingsFull : compSupplierSavingsFull;
  }, [supplierType, fgSupplierSavingsFull, compSupplierSavingsFull]);

  // Filter supplier list on UI search
  const filteredSuppliers = useMemo(() => {
    return activeSupplierSavingsList.filter(s => 
      s.supplierName.toLowerCase().includes(supplierSearchQuery.toLowerCase())
    );
  }, [activeSupplierSavingsList, supplierSearchQuery]);

  // ==========================================
  // 3. CBD SUMMARY WITH ASSOCIATED DATA
  // ==========================================
  const cbdListWithDetails = useMemo(() => {
    const list: Record<string, {
      cbdId: string;
      status: string;
      season: string;
      country: string;
      itemsCount: number;
      totalSavings: number;
      totalQty: number;
      primarySupplier: string;
    }> = {};

    rows.forEach(r => {
      const cbdId = String(r[cbdIdCol] || "").trim();
      if (!cbdId) return;

      const gapSavings = parseNum(r[totalGapCol]);
      const qtyVal = parseNum(r[qtyCol]);
      const supplierVal = String(r[fgSupplierCol] || "").trim();

      if (!list[cbdId]) {
        list[cbdId] = {
          cbdId,
          status: String(r[cbdStatusCol] || "Unknown"),
          season: String(r[seasonCol] || "N/A"),
          country: String(r[countryCol] || "N/A"),
          itemsCount: 0,
          totalSavings: 0,
          totalQty: 0,
          primarySupplier: supplierVal
        };
      }

      list[cbdId].itemsCount += 1;
      list[cbdId].totalSavings += gapSavings;
      list[cbdId].totalQty += qtyVal;
    });

    return Object.values(list).sort((a,b) => b.totalSavings - a.totalSavings);
  }, [rows, cbdIdCol, cbdStatusCol, seasonCol, countryCol, totalGapCol, qtyCol, fgSupplierCol]);

  const filteredCbds = useMemo(() => {
    return cbdListWithDetails.filter(c => 
      c.cbdId.toLowerCase().includes(cbdSearchQuery.toLowerCase()) ||
      c.primarySupplier.toLowerCase().includes(cbdSearchQuery.toLowerCase()) ||
      c.status.toLowerCase().includes(cbdSearchQuery.toLowerCase())
    );
  }, [cbdListWithDetails, cbdSearchQuery]);

  // ==========================================
  // 4. PROCESS/SECTION-WISE SAVINGS AGGREGATE
  // ==========================================
  const processWiseSavings = useMemo(() => {
    const aggregates: Record<string, {
      section: string;
      savingsPot: number;
      itemsCount: number;
      totalQty: number;
      uniqueCbds: Set<string>;
      uniqueSuppliers: Set<string>;
    }> = {};

    rows.forEach(r => {
      const sectionName = String(r[sectionCol] || "(Blank/Unknown)").trim();
      const gapSavings = parseNum(r[totalGapCol]);
      const qtyVal = parseNum(r[qtyCol]);
      const cbdId = String(r[cbdIdCol] || "").trim();
      const supplierName = String(r[fgSupplierCol] || "").trim();

      if (!aggregates[sectionName]) {
        aggregates[sectionName] = {
          section: sectionName,
          savingsPot: 0,
          itemsCount: 0,
          totalQty: 0,
          uniqueCbds: new Set(),
          uniqueSuppliers: new Set()
        };
      }

      aggregates[sectionName].savingsPot += gapSavings;
      aggregates[sectionName].itemsCount += 1;
      aggregates[sectionName].totalQty += qtyVal;
      if (cbdId) aggregates[sectionName].uniqueCbds.add(cbdId);
      if (supplierName) aggregates[sectionName].uniqueSuppliers.add(supplierName);
    });

    return Object.values(aggregates).map(item => ({
      processSection: item.section,
      uniqueCbdsCount: item.uniqueCbds.size,
      uniqueSuppliersCount: item.uniqueSuppliers.size,
      itemsCount: item.itemsCount,
      totalQty: item.totalQty,
      totalSavings: Number(item.savingsPot.toFixed(2)),
      avgGap: item.itemsCount > 0 ? Number((item.savingsPot / item.itemsCount).toFixed(2)) : 0
    })).sort((a, b) => b.totalSavings - a.totalSavings);
  }, [rows, sectionCol, totalGapCol, qtyCol, cbdIdCol, fgSupplierCol]);

  const filteredProcesses = useMemo(() => {
    return processWiseSavings.filter(p => 
      p.processSection.toLowerCase().includes(processSearchQuery.toLowerCase())
    );
  }, [processWiseSavings, processSearchQuery]);

  // ==========================================
  // DETAILED DRILLDOWN VIEWS
  // ==========================================

  // Drilldown: Supplier Detail Expansion
  const currentSupplierDetail = useMemo(() => {
    if (!selectedSupplierId) return null;
    const targetCol = supplierType === "fg_supplier" ? fgSupplierCol : compSupplierCol;
    const supplierRows = rows.filter(r => String(r[targetCol] || "").trim() === selectedSupplierId);
    
    let totalSavings = 0;
    let totalQty = 0;
    const uniqCbds = new Set<string>();

    supplierRows.forEach(r => {
      totalSavings += parseNum(r[totalGapCol]);
      totalQty += parseNum(r[qtyCol]);
      const cid = String(r[cbdIdCol] || "").trim();
      if (cid) uniqCbds.add(cid);
    });

    return {
      supplier: selectedSupplierId,
      rows: supplierRows,
      totalSavings,
      totalQty,
      cbdsCount: uniqCbds.size,
      cbdsList: Array.from(uniqCbds)
    };
  }, [rows, selectedSupplierId, supplierType, fgSupplierCol, compSupplierCol, totalGapCol, qtyCol, cbdIdCol]);

  // Drilldown: CBD Detail Accordion
  const currentCbdDetail = useMemo(() => {
    if (!selectedCbdId) return null;
    const cbdRows = rows.filter(r => String(r[cbdIdCol] || "").trim() === selectedCbdId);
    
    let totalSavings = 0;
    let totalQty = 0;
    let status = "Unknown";
    let season = "Unknown";
    let country = "Unknown";
    let fgSupplierName = "";

    if (cbdRows.length > 0) {
      status = String(cbdRows[0][cbdStatusCol] || "Unknown");
      season = String(cbdRows[0][seasonCol] || "Unknown");
      country = String(cbdRows[0][countryCol] || "Unknown");
      fgSupplierName = String(cbdRows[0][fgSupplierCol] || "Unknown");
    }

    cbdRows.forEach(r => {
      totalSavings += parseNum(r[totalGapCol]);
      totalQty += parseNum(r[qtyCol]);
    });

    return {
      cbdId: selectedCbdId,
      status,
      season,
      country,
      fgSupplier: fgSupplierName,
      totalSavings,
      totalQty,
      rowCount: cbdRows.length,
      items: cbdRows
    };
  }, [rows, selectedCbdId, cbdIdCol, cbdStatusCol, seasonCol, countryCol, fgSupplierCol, totalGapCol, qtyCol]);

  // Drilldown: Process/Section Detail Accordion
  const currentProcessDetail = useMemo(() => {
    if (!selectedProcessSection) return null;
    const sectionRows = rows.filter(r => String(r[sectionCol] || "").trim() === selectedProcessSection);
    
    let totalSavings = 0;
    let totalQty = 0;
    const uniqCbds = new Set<string>();
    const uniqSuppliers = new Set<string>();

    sectionRows.forEach(r => {
      totalSavings += parseNum(r[totalGapCol]);
      totalQty += parseNum(r[qtyCol]);
      const cid = String(r[cbdIdCol] || "").trim();
      if (cid) uniqCbds.add(cid);
      const supplierName = String(r[fgSupplierCol] || "").trim();
      if (supplierName) uniqSuppliers.add(supplierName);
    });

    return {
      section: selectedProcessSection,
      rows: sectionRows,
      totalSavings,
      totalQty,
      cbdsCount: uniqCbds.size,
      cbdsList: Array.from(uniqCbds),
      suppliersCount: uniqSuppliers.size,
      suppliersList: Array.from(uniqSuppliers)
    };
  }, [rows, selectedProcessSection, sectionCol, totalGapCol, qtyCol, cbdIdCol, fgSupplierCol]);

  // ==========================================
  // CHART BUILDERS
  // ==========================================

  // Vendor Chart
  const supplierChartData = useMemo(() => {
    return activeSupplierSavingsList.slice(0, 10).map(s => ({
      name: s.supplierName.length > 18 ? s.supplierName.substring(0, 16) + '...' : s.supplierName,
      fullName: s.supplierName,
      savings: Number(s.totalSavings.toFixed(1)),
      items: s.itemsCount
    }));
  }, [activeSupplierSavingsList]);

  // Process-Wise Chart
  const processChartData = useMemo(() => {
    return processWiseSavings.slice(0, 8).map(p => ({
      name: p.processSection.length > 18 ? p.processSection.substring(0, 16) + '...' : p.processSection,
      fullName: p.processSection,
      savings: Number(p.totalSavings.toFixed(1)),
      items: p.itemsCount
    }));
  }, [processWiseSavings]);

  // ==========================================
  // CSV EXPORT UTILITY HANDLERS
  // ==========================================
  const downloadCSVFile = (filename: string, headersArray: string[], dataRows: (string | number)[][]) => {
    const csvContent = [
      headersArray.map(h => `"${String(h).replace(/"/g, '""')}"`).join(","),
      ...dataRows.map(r => r.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(","))
    ].join("\r\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportFGSuppliers = () => {
    const headersList = [
      "Finished Good (FG) Supplier Name", 
      "Unique CBD Contracts Count", 
      "Procurement Items Count", 
      "Total Sourced Volume Quantity", 
      "Total Potential Cost Savings (USD)", 
      "Average Savings Per Line Item (USD)"
    ];
    const rowsList = fgSupplierSavingsFull.map(item => [
      item.supplierName,
      item.uniqueCbdsCount,
      item.itemsCount,
      item.totalQty,
      item.totalSavings,
      item.avgGap
    ]);
    downloadCSVFile("FG_Supplier_Savings_Extract.csv", headersList, rowsList);
  };

  const handleExportCompSuppliers = () => {
    const headersList = [
      "Component Supplier Name", 
      "Unique CBD Contracts Count", 
      "Procurement Items Count", 
      "Total Sourced Volume Quantity", 
      "Total Potential Cost Savings (USD)", 
      "Average Savings Per Line Item (USD)"
    ];
    const rowsList = compSupplierSavingsFull.map(item => [
      item.supplierName,
      item.uniqueCbdsCount,
      item.itemsCount,
      item.totalQty,
      item.totalSavings,
      item.avgGap
    ]);
    downloadCSVFile("Component_Supplier_Savings_Extract.csv", headersList, rowsList);
  };

  const handleExportCBDTopLevel = () => {
    const headersList = [
      "CBD Contract ID", 
      "CBD Status", 
      "Season Segment", 
      "Sourcing Country", 
      "Primary Vendor (FG)", 
      "Material Items Count", 
      "Total Contract Quantity", 
      "Total Contract Savings Potential (USD)",
      "Average Savings Per Material Item (USD)"
    ];
    const rowsList = cbdListWithDetails.map(item => [
      item.cbdId,
      item.status,
      item.season,
      item.country,
      item.primarySupplier,
      item.itemsCount,
      item.totalQty,
      item.totalSavings,
      item.itemsCount > 0 ? Number((item.totalSavings / item.itemsCount).toFixed(2)) : 0
    ]);
    downloadCSVFile("CBD_Contracts_Top_Level_Report.csv", headersList, rowsList);
  };

  const handleExportProcessWise = () => {
    const headersList = [
      "Sourcing Section / Production Process", 
      "Unique CBD Contracts Involved", 
      "Unique Suppliers Assigned", 
      "Material Sourcing Lines Count", 
      "Total Sourced Quantity Units", 
      "Total Potential Process Savings (USD)", 
      "Average Savings Per Sourcing Line (USD)"
    ];
    const rowsList = processWiseSavings.map(item => [
      item.processSection,
      item.uniqueCbdsCount,
      item.uniqueSuppliersCount,
      item.itemsCount,
      item.totalQty,
      item.totalSavings,
      item.avgGap
    ]);
    downloadCSVFile("Process_Wise_Savings_Sourcing_Report.csv", headersList, rowsList);
  };

  return (
    <div className="space-y-6 w-full">
      
      {/* 1. Dynamic Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Identified CBD Contracts</p>
              <h4 className="text-3xl font-black mt-1 text-slate-900">{cbdStats.cbdCount}</h4>
            </div>
            <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-3 font-semibold">
            Across {cbdStats.totalItems} distinct materials
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Potential Cost Savings</p>
              <h4 className="text-3xl font-black mt-1 text-emerald-600">${cbdStats.totalSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h4>
            </div>
            <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="w-full bg-slate-100 h-1 rounded-full mt-3">
            <div className="bg-emerald-500 h-1 rounded-full w-full"></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Suppliers (FG/Comp)</p>
              <h4 className="text-3xl font-black mt-1 text-slate-900">
                {cbdStats.fgSupplierCount} <span className="text-sm text-slate-400 font-normal">/ {cbdStats.compSupplierCount}</span>
              </h4>
            </div>
            <div className="bg-cyan-50 p-2 rounded-lg text-cyan-600">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-3 font-semibold">
            Primary finished goods & material vendors
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Procurement Sections</p>
              <h4 className="text-3xl font-black mt-1 text-slate-800">{cbdStats.processSectionsCount}</h4>
            </div>
            <div className="bg-amber-50 p-2 rounded-lg text-amber-600">
              <Cpu className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-3 font-semibold">
            Active production & sourcing process divisions
          </p>
        </div>
      </div>

      {/* 2. Global BI Reporting & Export Hub */}
      <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-850 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 font-extrabold text-xs uppercase tracking-wider">
              <Download className="w-4 h-4" />
              <span>Executive Sourcing & BI Report Export Center</span>
            </div>
            <p className="text-xs text-slate-300 mt-1">Download pre-aggregated financial sourcing reports directly in CSV format for offline processing or ERP inputs.</p>
          </div>
          
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
            <button
              onClick={handleExportFGSuppliers}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold py-2 px-3 rounded-lg border border-indigo-500/50 transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
              title="Download full Finished Good Supplier aggregates"
            >
              <Building2 className="w-3.5 h-3.5 text-indigo-200 flex-shrink-0" />
              <span>FG Vendors</span>
            </button>
            <button
              onClick={handleExportCompSuppliers}
              className="bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold py-2 px-3 rounded-lg border border-cyan-500/50 transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
              title="Download Component supplier aggregates"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-200 flex-shrink-0" />
              <span>Comp Vendors</span>
            </button>
            <button
              onClick={handleExportCBDTopLevel}
              className="bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold py-2 px-3 rounded-lg border border-amber-500/50 transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
              title="Download master CBD top-level overview report"
            >
              <Layers className="w-3.5 h-3.5 text-amber-200 flex-shrink-0" />
              <span>CBD Contracts</span>
            </button>
            <button
              onClick={handleExportProcessWise}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold py-2 px-3 rounded-lg border border-emerald-500/50 transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
              title="Download aggregated Process Section report"
            >
              <Cpu className="w-3.5 h-3.5 text-emerald-200 flex-shrink-0" />
              <span>Process Savings</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Primary Dashboard Sub-Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white p-1 rounded-xl shadow-2xs gap-1">
        <button
          onClick={() => setCurrentTab("vendors")}
          className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            currentTab === "vendors" 
              ? "bg-indigo-600 text-white shadow-xs" 
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Sourcing Vendors Analysis (FG & Component)</span>
        </button>
        <button
          onClick={() => setCurrentTab("cbds")}
          className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            currentTab === "cbds" 
              ? "bg-indigo-600 text-white shadow-xs" 
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>CBD Sourcing Contracts Terminal</span>
        </button>
        <button
          onClick={() => setCurrentTab("processes")}
          className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            currentTab === "processes" 
              ? "bg-indigo-600 text-white shadow-xs" 
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Process-Wise Savings Report</span>
        </button>
      </div>

      {/* 4. Tab Content Area */}
      <div>
        
        {/* TAB A: VENDOR ANALYSIS VIEW */}
        {currentTab === "vendors" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left table of vendors (7/12 span) */}
            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="p-5 border-b border-slate-150 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-850 uppercase tracking-wider flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    Supplier-Wise Savings Index
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Sum absolute savings, item quantity, and active CBD counts per supplier</p>
                </div>
                <div className="flex bg-slate-200/60 p-0.5 rounded text-xs">
                  <button
                    onClick={() => { setSupplierType("fg_supplier"); setSelectedSupplierId(""); }}
                    className={`px-3 py-1 rounded-sm font-semibold transition cursor-pointer ${supplierType === "fg_supplier" ? "bg-white text-indigo-700 shadow-2xs font-extrabold" : "text-slate-600 hover:text-slate-900"}`}
                  >
                    FG Supplier
                  </button>
                  <button
                    onClick={() => { setSupplierType("component_supplier"); setSelectedSupplierId(""); }}
                    className={`px-3 py-1 rounded-sm font-semibold transition cursor-pointer ${supplierType === "component_supplier" ? "bg-white text-indigo-700 shadow-2xs font-extrabold" : "text-slate-600 hover:text-slate-900"}`}
                  >
                    Component Vendor
                  </button>
                </div>
              </div>

              {/* Chart of top vendor savings */}
              {supplierChartData.length > 0 && (
                <div className="p-5 border-b border-slate-100">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Top 10 Suppliers by Potential Savings ($)</p>
                    <button
                      onClick={supplierType === "fg_supplier" ? handleExportFGSuppliers : handleExportCompSuppliers}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>Export Active Vendor Table (CSV)</span>
                    </button>
                  </div>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={supplierChartData} margin={{ top: 5, right: 10, left: 10, bottom: 20 }}>
                        <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} interval={0} />
                        <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip 
                          cursor={{ fill: '#f1f5f9', opacity: 0.5 }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-slate-900 text-white p-2.5 rounded shadow-lg text-xs space-y-1">
                                  <p className="font-bold">{data.fullName}</p>
                                  <p className="text-emerald-400 font-semibold">Total Savings: ${data.savings.toLocaleString()}</p>
                                  <p className="text-slate-300">Procured Lines: {data.items}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="savings" fill="#4f46e5" radius={[3, 3, 0, 0]}>
                          {supplierChartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={selectedSupplierId === entry.fullName ? '#059669' : '#4f46e5'} 
                              style={{ cursor: "pointer" }}
                              onClick={() => setSelectedSupplierId(selectedSupplierId === entry.fullName ? "" : entry.fullName)}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Sourcing Vendor search & table */}
              <div className="p-4 border-b border-slate-150">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search active suppliers by name..."
                    value={supplierSearchQuery}
                    onChange={(e) => setSupplierSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-150 select-none">
                      <th className="py-2.5 px-4 uppercase tracking-wider text-[10px]">Supplier Name</th>
                      <th className="py-2.5 px-4 uppercase tracking-wider text-[10px] text-right">Unique CBDs</th>
                      <th className="py-2.5 px-4 uppercase tracking-wider text-[10px] text-right">Lines</th>
                      <th className="py-2.5 px-4 uppercase tracking-wider text-[10px] text-right">Total Quantity</th>
                      <th className="py-2.5 px-4 uppercase tracking-wider text-[10px] text-right text-indigo-600">Potential Savings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSuppliers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">No suppliers match your search terms.</td>
                      </tr>
                    ) : (
                      filteredSuppliers.map((sup, idx) => (
                        <tr 
                          key={idx} 
                          onClick={() => setSelectedSupplierId(selectedSupplierId === sup.supplierName ? "" : sup.supplierName)}
                          className={`hover:bg-indigo-50/20 cursor-pointer transition-colors ${selectedSupplierId === sup.supplierName ? "bg-indigo-50/50" : ""}`}
                        >
                          <td className="py-3 px-4 font-bold text-slate-850 break-all vertical-top">
                            <span className="flex items-center gap-1.5">
                              {selectedSupplierId === sup.supplierName && <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />}
                              {sup.supplierName}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-600">{sup.uniqueCbdsCount}</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-600">{sup.itemsCount}</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-600">{sup.totalQty.toLocaleString()}</td>
                          <td className="py-3 px-4 text-right font-mono font-black text-emerald-600">
                            ${sup.totalSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Supplier details Drilldown (5/12 span) */}
            <div className="lg:col-span-5">
              {currentSupplierDetail ? (
                <div className="bg-white p-5 rounded-xl border border-slate-250 shadow-sm space-y-4">
                  <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-widest bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">Supplier Deep-Dive</span>
                      <h3 className="text-sm font-bold text-slate-850 mt-1 select-all">{currentSupplierDetail.supplier}</h3>
                    </div>
                    <button 
                      onClick={() => setSelectedSupplierId("")}
                      className="text-xs text-slate-450 hover:text-slate-600 font-bold"
                    >
                      Clear Selection
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 bg-slate-50 border border-slate-100 rounded">
                      <span className="text-[9px] text-slate-400 block uppercase font-bold">Associated CBDs</span>
                      <strong className="text-sm font-bold text-slate-800 mt-1">{currentSupplierDetail.cbdsCount}</strong>
                    </div>
                    <div className="p-2.5 bg-slate-50 border border-slate-100 rounded">
                      <span className="text-[9px] text-slate-400 block uppercase font-bold">Item Lines</span>
                      <strong className="text-sm font-bold text-slate-800 mt-1">{currentSupplierDetail.rows.length}</strong>
                    </div>
                    <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded">
                      <span className="text-[9px] text-emerald-600 block uppercase font-bold">Savings Pot.</span>
                      <strong className="text-sm font-bold text-emerald-700 mt-1">
                        ${currentSupplierDetail.totalSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </strong>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">List of Related CBD IDs:</span>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-slate-50 rounded border border-slate-100">
                      {currentSupplierDetail.cbdsList.map((cid, i) => (
                        <button
                          key={i}
                          onClick={() => { setSelectedCbdId(cid); setCurrentTab("cbds"); }}
                          className="text-[10px] py-1 px-2 font-bold rounded border bg-white hover:bg-slate-50 text-indigo-600 border-slate-200 transition-colors"
                        >
                          CBD ID #{cid}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sourced Materials Breakout:</span>
                    <div className="max-h-[260px] overflow-y-auto space-y-1.5 pr-1">
                      {currentSupplierDetail.rows.map((rowArr, i) => (
                        <div key={i} className="p-2 border border-slate-155 rounded text-[11px] hover:border-slate-300 bg-slate-50 flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold text-slate-800 select-all leading-snug">{rowArr[designationCol] || "No description"}</div>
                            <div className="text-[9px] text-slate-450 mt-1 font-mono">
                              Code: {rowArr[codeCol] || "N/A"} • CBD: #{rowArr[cbdIdCol] || "N/A"}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className="font-bold text-emerald-600 block">${parseNum(rowArr[totalGapCol]).toLocaleString()}</span>
                            <span className="text-[9px] text-slate-400 block font-mono">{Number(rowArr[qtyCol]).toLocaleString()} Units</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-dashed border-slate-200 p-8 rounded-xl flex flex-col items-center justify-center text-center text-slate-400">
                  <Building2 className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-xs font-semibold leading-relaxed">Select any active Finished Good (FG) supplier or Component vendor from the index table to visualize their deep-dive profile, related material lines, and associated contract IDs.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB B: CBD CONTRACTS TERMINAL */}
        {currentTab === "cbds" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left table of CBD contracts (7/12 span) */}
            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="p-5 border-b border-slate-150 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-850 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    CBD Contract Sourcing Terminal
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Audit contract status, country of manufacture, material volume, and savings margins</p>
                </div>
                <button
                  onClick={handleExportCBDTopLevel}
                  className="bg-white hover:bg-slate-50 text-slate-700 text-xs py-1.5 px-3 rounded border border-slate-200 font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Export Contracts Report (CSV)</span>
                </button>
              </div>

              <div className="p-4 border-b border-slate-150">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Filter CBD by ID, country, status, or supplier name..."
                    value={cbdSearchQuery}
                    onChange={(e) => setCbdSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="overflow-y-auto max-h-[520px] divide-y divide-slate-100">
                {filteredCbds.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 font-medium text-xs">No matching CBD contracts found in this sheet.</div>
                ) : (
                  filteredCbds.map((cbd, i) => (
                    <div 
                      key={i}
                      onClick={() => setSelectedCbdId(selectedCbdId === cbd.cbdId ? "" : cbd.cbdId)}
                      className={`p-3.5 hover:bg-slate-50 cursor-pointer transition duration-150 flex items-center justify-between gap-3 ${selectedCbdId === cbd.cbdId ? "bg-indigo-50/50" : ""}`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs">CBD Contract #{cbd.cbdId}</span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                            cbd.status.toLowerCase().includes("submit") ? "bg-blue-50 text-blue-700 border border-blue-100" :
                            cbd.status.toLowerCase().includes("review") ? "bg-amber-50 text-amber-700 border border-amber-100" :
                            "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          }`}>
                            {cbd.status}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Season: {cbd.season} • Country: {cbd.country} • Vendor: {cbd.primarySupplier.substring(0, 32)}...
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <span className="text-xs font-black text-emerald-600 block">${cbd.totalSavings.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        <span className="text-[9px] text-slate-400 font-bold block">{cbd.itemsCount} materials</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right CBD Detail profile (5/12 span) */}
            <div className="lg:col-span-5">
              {currentCbdDetail ? (
                <div className="bg-white p-5 rounded-xl border border-slate-250 shadow-sm space-y-4">
                  <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-widest bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">CBD Master Profile</span>
                      <h3 className="text-sm font-bold text-slate-850 mt-1">CBD Contract ID: #{currentCbdDetail.cbdId}</h3>
                    </div>
                    <button 
                      onClick={() => setSelectedCbdId("")}
                      className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                    >
                      Close Profile
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-lg border border-slate-150">
                    <div className="space-y-1">
                      <span className="text-slate-400 block text-[9px] font-bold uppercase">Contract Status</span>
                      <span className="font-bold text-indigo-700">{currentCbdDetail.status}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-400 block text-[9px] font-bold uppercase">Source/Country</span>
                      <span className="font-semibold text-slate-800 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        {currentCbdDetail.country}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-400 block text-[9px] font-bold uppercase">Season Segment</span>
                      <span className="font-semibold text-slate-800 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        {currentCbdDetail.season}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-400 block text-[9px] font-bold uppercase">Primary Supplier</span>
                      <span className="font-semibold text-slate-800 truncate block select-all" title={currentCbdDetail.fgSupplier}>
                        {currentCbdDetail.fgSupplier}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider block">Contract Savings Potential</span>
                      <p className="text-xl font-black text-emerald-700">${currentCbdDetail.totalSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider block">Volume Units</span>
                      <p className="text-xl font-black text-slate-800">{currentCbdDetail.totalQty.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Material Items under CBD #{currentCbdDetail.cbdId}:</span>
                    <div className="max-h-[260px] overflow-y-auto space-y-2 border border-slate-100 p-2 rounded bg-slate-50">
                      {currentCbdDetail.items.map((item, i) => (
                        <div key={i} className="p-2.5 bg-white border border-slate-200 rounded text-xs hover:border-indigo-200 transition-colors">
                          <div className="flex justify-between items-start gap-2">
                            <div className="font-bold text-slate-850 truncate leading-tight select-all" title={item[designationCol]}>
                              {item[designationCol]}
                            </div>
                            <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 px-1 py-0.5 rounded font-black flex-shrink-0">
                              {Number(item[qtyCol]).toLocaleString()} qty
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-mono">
                            <div>
                              Code: <span className="text-slate-600 font-black select-all">{item[codeCol] || "N/A"}</span> • Sec: <span className="text-slate-600 font-bold">{String(item[sectionCol] || "N/A")}</span>
                            </div>
                            <div className="text-emerald-600 font-black text-[11px]">
                              Gap Save: ${parseNum(item[totalGapCol]).toLocaleString()} 
                              <span className="text-slate-300 font-normal ml-1">(${parseNum(item[gapCol]).toLocaleString()}/ea)</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-dashed border-slate-200 p-8 rounded-xl flex flex-col items-center justify-center text-center text-slate-400">
                  <Layers className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-xs font-semibold leading-relaxed">Select an individual CBD from the terminal list to open its master contract, status records, sourcing origin, and a table of all materials grouped under the ID.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB C: PROCESS-WISE SAVINGS ANALYSIS */}
        {currentTab === "processes" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Sourcing Process list & summary (7/12 span) */}
            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="p-5 border-b border-slate-150 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-850 uppercase tracking-wider flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-indigo-600" />
                    Process-Wise Savings Report
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Analyse potential sourcing savings grouped by manufacturing divisions, packaging, and marking processes</p>
                </div>
                <button
                  onClick={handleExportProcessWise}
                  className="bg-white hover:bg-slate-50 text-slate-700 text-xs py-1.5 px-3 rounded border border-slate-200 font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Export Process Report (CSV)</span>
                </button>
              </div>

              {/* Chart of Process-wise savings */}
              {processChartData.length > 0 && (
                <div className="p-5 border-b border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Top Sourcing Processes by Financial Savings ($)</p>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={processChartData} margin={{ top: 5, right: 10, left: 10, bottom: 20 }}>
                        <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} interval={0} />
                        <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip 
                          cursor={{ fill: '#f1f5f9', opacity: 0.5 }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-slate-900 text-white p-2.5 rounded shadow-lg text-xs space-y-1">
                                  <p className="font-bold">{data.fullName}</p>
                                  <p className="text-emerald-400 font-semibold">Savings Gap: ${data.savings.toLocaleString()}</p>
                                  <p className="text-slate-300">Material Lines: {data.items}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="savings" fill="#10b981" radius={[3, 3, 0, 0]}>
                          {processChartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={selectedProcessSection === entry.fullName ? '#4f46e5' : '#10b981'} 
                              style={{ cursor: "pointer" }}
                              onClick={() => setSelectedProcessSection(selectedProcessSection === entry.fullName ? "" : entry.fullName)}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Filter search box */}
              <div className="p-4 border-b border-slate-150">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search sourcing processes by section name..."
                    value={processSearchQuery}
                    onChange={(e) => setProcessSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Process table list */}
              <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-150 select-none">
                      <th className="py-2.5 px-4 uppercase tracking-wider text-[10px]">Sourcing Section / Process</th>
                      <th className="py-2.5 px-4 uppercase tracking-wider text-[10px] text-right">Unique CBDs</th>
                      <th className="py-2.5 px-4 uppercase tracking-wider text-[10px] text-right">Suppliers</th>
                      <th className="py-2.5 px-4 uppercase tracking-wider text-[10px] text-right">Material Lines</th>
                      <th className="py-2.5 px-4 uppercase tracking-wider text-[10px] text-right">Total Quantity</th>
                      <th className="py-2.5 px-4 uppercase tracking-wider text-[10px] text-right text-indigo-600">Potential Savings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProcesses.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">No sourcing processes match your search terms.</td>
                      </tr>
                    ) : (
                      filteredProcesses.map((proc, idx) => (
                        <tr 
                          key={idx} 
                          onClick={() => setSelectedProcessSection(selectedProcessSection === proc.processSection ? "" : proc.processSection)}
                          className={`hover:bg-emerald-50/10 cursor-pointer transition-colors ${selectedProcessSection === proc.processSection ? "bg-emerald-50/20" : ""}`}
                        >
                          <td className="py-3 px-4 font-bold text-slate-850 break-all vertical-top">
                            <span className="flex items-center gap-1.5">
                              {selectedProcessSection === proc.processSection && <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />}
                              <span className="capitalize">{proc.processSection}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-600">{proc.uniqueCbdsCount}</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-600">{proc.uniqueSuppliersCount}</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-600">{proc.itemsCount}</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-600">{proc.totalQty.toLocaleString()}</td>
                          <td className="py-3 px-4 text-right font-mono font-black text-emerald-600">
                            ${proc.totalSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right details accordion for process drilldown (5/12 span) */}
            <div className="lg:col-span-5">
              {currentProcessDetail ? (
                <div className="bg-white p-5 rounded-xl border border-slate-250 shadow-sm space-y-4">
                  <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">Process Sourcing Breakout</span>
                      <h3 className="text-sm font-bold text-slate-850 mt-1 select-all capitalize">{currentProcessDetail.section} Division</h3>
                    </div>
                    <button 
                      onClick={() => setSelectedProcessSection("")}
                      className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                    >
                      Clear Selection
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
                    <div className="p-2 bg-slate-50 border border-slate-100 rounded">
                      <span className="text-[8px] text-slate-400 block uppercase font-bold leading-normal">CBD IDs</span>
                      <strong className="text-xs font-bold text-slate-800 mt-0.5">{currentProcessDetail.cbdsCount}</strong>
                    </div>
                    <div className="p-2 bg-slate-50 border border-slate-100 rounded">
                      <span className="text-[8px] text-slate-400 block uppercase font-bold leading-normal">Suppliers</span>
                      <strong className="text-xs font-bold text-slate-800 mt-0.5">{currentProcessDetail.suppliersCount}</strong>
                    </div>
                    <div className="p-2 bg-slate-50 border border-slate-100 rounded">
                      <span className="text-[8px] text-slate-400 block uppercase font-bold leading-normal">Material Lines</span>
                      <strong className="text-xs font-bold text-slate-800 mt-0.5">{currentProcessDetail.rows.length}</strong>
                    </div>
                    <div className="p-2 bg-emerald-50 border border-emerald-100 rounded">
                      <span className="text-[8px] text-emerald-600 block uppercase font-bold leading-normal">Savings</span>
                      <strong className="text-xs font-bold text-emerald-700 mt-0.5">
                        ${currentProcessDetail.totalSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </strong>
                    </div>
                  </div>

                  {/* Allied Suppliers list */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Sourcing Suppliers:</span>
                    <div className="flex flex-wrap gap-1 bg-slate-50 p-2 rounded border border-slate-150 max-h-24 overflow-y-auto">
                      {currentProcessDetail.suppliersList.map((sup, idx) => (
                        <button
                          key={idx}
                          onClick={() => { setSelectedSupplierId(sup); setSupplierType("fg_supplier"); setCurrentTab("vendors"); }}
                          className="text-[9px] bg-white border border-slate-200 px-2 py-0.5 rounded font-bold text-indigo-600 hover:bg-indigo-50/50 cursor-pointer"
                        >
                          {sup}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* List of related raw materials */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Production Sourced Items:</span>
                    <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1">
                      {currentProcessDetail.rows.map((rowArr, i) => (
                        <div key={i} className="p-2 border border-slate-155 rounded text-[11px] hover:border-slate-300 bg-slate-50 flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold text-slate-800 select-all leading-snug">{rowArr[designationCol] || "No description"}</div>
                            <div className="text-[9px] text-slate-400 mt-1 font-mono">
                              Code: {rowArr[codeCol] || "N/A"} • CBD ID: #{rowArr[cbdIdCol] || "N/A"}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className="font-bold text-emerald-600 block">${parseNum(rowArr[totalGapCol]).toLocaleString()}</span>
                            <span className="text-[9px] text-slate-400 block font-mono">{Number(rowArr[qtyCol]).toLocaleString()} Units</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-dashed border-slate-200 p-8 rounded-xl flex flex-col items-center justify-center text-center text-slate-400">
                  <Cpu className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-xs font-semibold leading-relaxed">Select an individual manufacturing process or department section from the index table to visualize the assigned contractors, contract volumes, and a drilldown list of all production materials.</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
