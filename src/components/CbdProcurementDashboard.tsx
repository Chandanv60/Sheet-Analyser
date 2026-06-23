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
  FileSpreadsheet
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

  // State
  const [selectedCbdId, setSelectedCbdId] = useState<string>("");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [cbdSearchQuery, setCbdSearchQuery] = useState("");
  const [supplierSearchQuery, setSupplierSearchQuery] = useState("");
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

  // 1. STATISTIC METRICS E.G. how Many CBD are present
  const cbdStats = useMemo(() => {
    const uniqueCbds = new Set<string>();
    const statusCounts: Record<string, number> = {};
    const supplierUnique = new Set<string>();
    
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
      if (fgSupplier) supplierUnique.add(fgSupplier);
      
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
      supplierCount: supplierUnique.size,
      statusBreakdown: statusArray,
      totalItems
    };
  }, [rows, cbdIdCol, cbdStatusCol, fgSupplierCol, totalGapCol]);

  // 2. SUPPLIER-WISE SAVINGS AGGREGATION
  const supplierSavings = useMemo(() => {
    const aggregates: Record<string, { 
      supplier: string; 
      savingsPot: number; 
      itemsCount: number; 
      totalQty: number;
      avgGap: number;
      cbds: Set<string>;
    }> = {};

    const targetCol = supplierType === "fg_supplier" ? fgSupplierCol : compSupplierCol;

    rows.forEach(r => {
      const supplierName = String(r[targetCol] || "(Blank/Unknown)").trim();
      if (!supplierName) return;

      const gapSavings = parseNum(r[totalGapCol]);
      const qtyVal = parseNum(r[qtyCol]);
      const cbdId = String(r[cbdIdCol] || "").trim();

      if (!aggregates[supplierName]) {
        aggregates[supplierName] = {
          supplier: supplierName,
          savingsPot: 0,
          itemsCount: 0,
          totalQty: 0,
          avgGap: 0,
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

    const list = Object.values(aggregates).map(item => ({
      ...item,
      uniqueCbdsCount: item.cbds.size,
      formattedSavings: Number(item.savingsPot.toFixed(2)),
      avgGap: item.itemsCount > 0 ? Number((item.savingsPot / item.itemsCount).toFixed(4)) : 0
    }));

    // Sort by physical savings
    return list.sort((a, b) => b.savingsPot - a.savingsPot);
  }, [rows, supplierType, fgSupplierCol, compSupplierCol, totalGapCol, qtyCol, cbdIdCol]);

  // Filters results based on search input
  const filteredSuppliers = useMemo(() => {
    return supplierSavings.filter(s => 
      s.supplier.toLowerCase().includes(supplierSearchQuery.toLowerCase())
    );
  }, [supplierSavings, supplierSearchQuery]);

  // 3. CBD SUMMARY WITH ASSOCIATED DATA
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

  // Selected supplier details
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

  // Selected CBD details
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

  // Chart data top suppliers
  const supplierChartData = useMemo(() => {
    return supplierSavings.slice(0, 10).map(s => ({
      name: s.supplier.length > 18 ? s.supplier.substring(0, 16) + '...' : s.supplier,
      fullName: s.supplier,
      savings: Number(s.savingsPot.toFixed(1)),
      items: s.itemsCount
    }));
  }, [supplierSavings]);

  return (
    <div className="space-y-6">
      
      {/* Dynamic Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Identified CBDs</p>
              <h4 className="text-3xl font-black mt-1 text-slate-900">{cbdStats.cbdCount}</h4>
            </div>
            <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-3 font-semibold">
            Across {cbdStats.totalItems} distinct procurement lines
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Savings Potential</p>
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
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Suppliers</p>
              <h4 className="text-3xl font-black mt-1 text-slate-900">{cbdStats.supplierCount}</h4>
            </div>
            <div className="bg-cyan-50 p-2 rounded-lg text-cyan-600">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-3 font-semibold">
            Unique finished good (FG) vendors
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Average Savings per line</p>
              <h4 className="text-3xl font-black mt-1 text-slate-800">
                ${cbdStats.totalItems > 0 ? (cbdStats.totalSavings / cbdStats.totalItems).toFixed(2) : "0.00"}
              </h4>
            </div>
            <div className="bg-amber-50 p-2 rounded-lg text-amber-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-3 font-semibold">
            Savings gaps represent optimized cost margins
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: SUPPLIER WISE ANALYTICS (6/12) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
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
                  className={`px-2.5 py-1 rounded-sm font-semibold transition cursor-pointer ${supplierType === "fg_supplier" ? "bg-white text-indigo-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"}`}
                >
                  FG Supplier
                </button>
                <button
                  onClick={() => { setSupplierType("component_supplier"); setSelectedSupplierId(""); }}
                  className={`px-2.5 py-1 rounded-sm font-semibold transition cursor-pointer ${supplierType === "component_supplier" ? "bg-white text-indigo-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"}`}
                >
                  Component Vendor
                </button>
              </div>
            </div>

            {/* Top 10 Suppliers Bar Chart */}
            {supplierChartData.length > 0 && (
              <div className="p-5 border-b border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Top 10 Suppliers by Total Potential Savings ($)</p>
                <div className="h-44 w-full">
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

            {/* Supplier list filter input */}
            <div className="p-4 border-b border-slate-150">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search suppliers by name..."
                  value={supplierSearchQuery}
                  onChange={(e) => setSupplierSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                />
              </div>
            </div>

            {/* List Table */}
            <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
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
                        onClick={() => setSelectedSupplierId(selectedSupplierId === sup.supplier ? "" : sup.supplier)}
                        className={`hover:bg-indigo-50/20 cursor-pointer transition-colors ${selectedSupplierId === sup.supplier ? "bg-indigo-50/50" : ""}`}
                      >
                        <td className="py-3 px-4 font-bold text-slate-800 break-all vertical-top">
                          <span className="flex items-center gap-1.5">
                            {selectedSupplierId === sup.supplier && <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />}
                            {sup.supplier}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600">{sup.uniqueCbdsCount}</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600">{sup.itemsCount}</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600">{sup.totalQty.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right font-mono font-black text-emerald-600">
                          ${sup.formattedSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SUPPLIER DETAIL EXPANSION */}
          {currentSupplierDetail && (
            <div className="bg-white p-5 rounded-xl border border-slate-250 shadow-sm space-y-4">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">Supplier Deep-Dive</span>
                  <h3 className="text-sm font-bold text-slate-850 mt-1 select-all">{currentSupplierDetail.supplier}</h3>
                </div>
                <button 
                  onClick={() => setSelectedSupplierId("")}
                  className="text-xs text-slate-400 hover:text-slate-600"
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

              {/* Show associated CBD IDs directly */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">List of Related CBD IDs:</span>
                <div className="flex flex-wrap gap-1.5">
                  {currentSupplierDetail.cbdsList.map((cid, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedCbdId(cid)}
                      className={`text-[10px] py-1 px-2.5 font-bold rounded border transition-colors ${selectedCbdId === cid ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"}`}
                    >
                      CBD ID {cid}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid of details */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Supplier Sourcing Items:</span>
                <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1">
                  {currentSupplierDetail.rows.map((rowArr, i) => (
                    <div key={i} className="p-2 border border-slate-150 rounded text-[11px] hover:border-slate-300 bg-slate-50 flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-800 select-all">{rowArr[designationCol] || "No description"}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono select-all">
                          Item Code: {rowArr[codeCol] || "N/A"} • CBD ID: {rowArr[cbdIdCol] || "N/A"}
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
          )}
        </div>

        {/* RIGHT COLUMN: CBD INVESTIGATION (5/12) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-150 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-850 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                CBD Investigation Terminal
              </h3>
              <p className="text-xs text-slate-500 mt-1">Discover, track, and examine individual CBD profiles and procurement contracts</p>
            </div>

            {/* CBD Search box */}
            <div className="p-4 border-b border-slate-150">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Filter CBD by ID, Status, or Vendor..."
                  value={cbdSearchQuery}
                  onChange={(e) => setCbdSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Scrollable list of CBD IDs */}
            <div className="overflow-y-auto max-h-[440px] divide-y divide-slate-100">
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
                        <span className="font-bold text-slate-900 text-xs">CBD #{cbd.cbdId}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm ${
                          cbd.status.toLowerCase().includes("submit") ? "bg-blue-50 text-blue-700 border border-blue-100" :
                          cbd.status.toLowerCase().includes("review") ? "bg-amber-50 text-amber-700 border border-amber-100" :
                          "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        }`}>
                          {cbd.status}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Season: {cbd.season} • Vendor: {cbd.primarySupplier.substring(0, 24)}...
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <span className="text-xs font-black text-emerald-600 block">${cbd.totalSavings.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      <span className="text-[9px] text-slate-400 font-bold block">{cbd.itemsCount} material items</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* SELECTED CBD DETAILED ACCORDION */}
          {currentCbdDetail ? (
            <div className="bg-white p-5 rounded-xl border border-slate-250 shadow-sm space-y-4">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">CBD Metadata Records</span>
                  <h3 className="text-sm font-bold text-slate-850 mt-1">CBD Contract ID: #{currentCbdDetail.cbdId}</h3>
                </div>
                <button 
                  onClick={() => setSelectedCbdId("")}
                  className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
                >
                  Close Profile
                </button>
              </div>

              {/* Status details */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Contract Status</span>
                  <span className="font-semibold text-slate-800">{currentCbdDetail.status}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Source/Country</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-500" />
                    {currentCbdDetail.country}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Season Segment</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    {currentCbdDetail.season}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Primary Supplier</span>
                  <span className="font-semibold text-slate-805 truncate block" title={currentCbdDetail.fgSupplier}>
                    {currentCbdDetail.fgSupplier}
                  </span>
                </div>
              </div>

              {/* Aggregated math metrics */}
              <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-bold text-indigo-500 uppercase">Aggregated Gap Savings</span>
                  <p className="text-lg font-black text-emerald-600">${currentCbdDetail.totalSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-bold text-indigo-500 uppercase">Volume Units</span>
                  <p className="text-lg font-black text-slate-800">{currentCbdDetail.totalQty.toLocaleString()}</p>
                </div>
              </div>

              {/* Table of all material items related to CBD */}
              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Material Items under CBD #{currentCbdDetail.cbdId}:</span>
                <div className="max-h-[220px] overflow-y-auto space-y-2 border border-slate-100 p-2 rounded bg-slate-50">
                  {currentCbdDetail.items.map((item, i) => (
                    <div key={i} className="p-2.5 bg-white border border-slate-200 rounded text-xs hover:border-indigo-200 transition-colors">
                      <div className="flex justify-between items-start gap-2">
                        <div className="font-bold text-slate-850 truncate leading-tight select-all" title={item[designationCol]}>
                          {item[designationCol]}
                        </div>
                        <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 px-1 py-0.5 rounded font-black">
                          {Number(item[qtyCol]).toLocaleString()} qty
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center mt-2 pt-1.5 border-t border-slate-100 text-[10px] text-slate-400 font-mono">
                        <div>
                          ID: <span className="text-slate-600 font-black select-all">{item[codeCol] || "N/A"}</span> • Section: <span className="text-slate-600 font-bold">{item["section"] || "N/A"}</span>
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
            <div className="bg-slate-50 border border-dashed border-slate-200 p-6 rounded-xl flex flex-col items-center justify-center text-center text-slate-400">
              <Layers className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs font-semibold">Select an individual CBD from the terminal to open its detailed metadata profiles, materials, and contracts.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
