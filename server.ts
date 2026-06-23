import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Initialize Gemini Client safely
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
  try {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  } catch (err) {
    console.error("Failed to initialize Gemini Client:", err);
  }
}

const app = express();
const PORT = 3000;

// Increase body sizes for large spreadsheets or copy pastes
app.use(express.json({ limit: "15mb" }));

// Robust state-machine CSV parser supporting newlines inside double-quotes
function parseCSV(csvContent: string): string[][] {
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
        i++; // skip next quote
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
  
  // Filter out completely empty rows
  return result.filter(r => r.length > 0 && r.some(col => col !== ""));
}

// Extract Spreadsheet ID and optional sub-sheet gid from Google Sheets URLs
function extractSheetInfo(urlOrId: string) {
  const cleanStr = urlOrId.trim();
  
  // If it's already just an alphanumeric ID
  if (/^[a-zA-Z0-9-_]{15,}$/.test(cleanStr)) {
    return { id: cleanStr, gid: null };
  }
  
  const idMatch = cleanStr.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]{15,})/);
  if (!idMatch) {
    return null;
  }
  const id = idMatch[1];
  
  // Check for gid parameter in URL
  const gidMatch = cleanStr.match(/[?&]gid=(\d+)/) || cleanStr.match(/#gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : null;
  
  return { id, gid };
}

// API: Parse Google Sheet URL or ID
app.post("/api/sheets/parse-url", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "Google Sheet URL or Spreadsheet ID is required" });
    }
    
    const info = extractSheetInfo(url);
    if (!info) {
      return res.status(400).json({ 
        error: "Invalid Google Sheets URL or ID form. Please paste a standard URL (e.g., https://docs.google.com/spreadsheets/d/.../edit#gid=0)" 
      });
    }
    
    // Construct public share URL for CSV export
    let csvUrl = `https://docs.google.com/spreadsheets/d/${info.id}/export?format=csv`;
    if (info.gid) {
      csvUrl += `&gid=${info.gid}`;
    }
    
    const fetchResponse = await fetch(csvUrl);
    if (!fetchResponse.ok) {
      return res.status(fetchResponse.status).json({
        error: `Could not fetch spreadsheet. Ensure the sheet permission is set to 'Anyone with the link can view' (Public Viewer access is required for link importing). Code: ${fetchResponse.status}`
      });
    }
    
    const csvContent = await fetchResponse.text();
    const parsed = parseCSV(csvContent);
    
    if (parsed.length === 0) {
      return res.status(400).json({ error: "The loaded Google Sheet appears to be completely empty." });
    }
    
    const headers = parsed[0].map(h => h || "Unnamed Column");
    const dataRows = parsed.slice(1);
    
    // Map list of lists to key-value record array
    const records = dataRows.map((rowArr, rowIndex) => {
      const record: Record<string, string> = { __id: String(rowIndex + 1) };
      headers.forEach((header, colIndex) => {
        record[header] = rowArr[colIndex] !== undefined ? rowArr[colIndex] : "";
      });
      return record;
    });
    
    return res.json({
      success: true,
      spreadsheetId: info.id,
      gid: info.gid,
      headers,
      rows: records,
      rowCount: records.length,
      colCount: headers.length
    });
  } catch (error: any) {
    console.error("Sheet import proxy error:", error);
    return res.status(500).json({ error: error.message || "An unexpected error occurred while parsing the Google Sheet." });
  }
});

// API: Analyze columns and draft dashboard reporting suggestions using server-side Gemini
app.post("/api/analyze-columns", async (req, res) => {
  try {
    const { headers, sampleRows } = req.body;
    if (!headers || !Array.isArray(headers)) {
      return res.status(400).json({ error: "Column headers list is required" });
    }
    
    // Fallback logic if Gemini is not configured/available helper
    const getFallbackMetadata = () => {
      const columns = headers.map(h => {
        const isNumeric = sampleRows && sampleRows.some((r: any) => {
          const val = String(r[h]).replace(/[$,%]/g, "").trim();
          return val !== "" && !isNaN(Number(val));
        });
        return {
          name: h,
          type: isNumeric ? "numerical" : "categorical",
          description: `General Column values for ${h}`
        };
      });
      
      const numericalCols = columns.filter(c => c.type === "numerical").map(c => c.name);
      const categoricalCols = columns.filter(c => c.type === "categorical").map(c => c.name);
      
      const defaultMeasure = numericalCols[0] || headers[headers.length - 1] || headers[0];
      const defaultDim = categoricalCols[0] || headers[0];
      
      const suggestions = [
        {
          title: `Distribution of records by ${defaultDim}`,
          description: `Auto-generated category analysis count for ${defaultDim}`,
          chartType: "bar",
          dimension: defaultDim,
          metric: defaultMeasure,
          aggregation: "count"
        }
      ];
      if (numericalCols.length > 0) {
        suggestions.push({
          title: `Total ${defaultMeasure} aggregated by ${defaultDim}`,
          description: `Business summary overview of ${defaultMeasure} metrics across ${defaultDim} components`,
          chartType: "pie",
          dimension: defaultDim,
          metric: defaultMeasure,
          aggregation: "sum"
        });
      }
      return { columns, suggestions };
    };
    
    if (!ai) {
      // Return beautiful structured rules without failing
      return res.json({
        ...getFallbackMetadata(),
        warning: "Running in local rules engine context. Configure GEMINI_API_KEY in Secrets for personalized AI-powered suggested dashboards!"
      });
    }
    
    const prompt = `Analyze the following Google Sheet dataset headers and sample rows.
Headers: ${JSON.stringify(headers)}
Sample Rows: ${JSON.stringify(sampleRows || [])}

Perform the following:
1. Examine column values and identify their types (numerical, categorical, temporal, or text) and briefly describe what that column likely represents.
2. Formulate 3 to 4 distinct, high-value, and creative analytical reports or KPIs focused on summarizing and reporting along different dimensions. Ensure you specify the recommended dimension (X-axis or split category), measure column (Y-axis metric), aggregate formula (sum, average, count, min, or max), and the ideal visual chart type (bar, line, area, pie, radial, scatter).
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            columns: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ["numerical", "categorical", "temporal", "text"] },
                  description: { type: Type.STRING }
                },
                required: ["name", "type", "description"]
              }
            },
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  chartType: { type: Type.STRING, enum: ["bar", "line", "area", "pie", "scatter", "radial"] },
                  dimension: { type: Type.STRING, description: "The column name to use as x-axis/group dimension." },
                  metric: { type: Type.STRING, description: "The column name to use as y-axis measure." },
                  aggregation: { type: Type.STRING, enum: ["sum", "average", "count", "min", "max"] }
                },
                required: ["title", "description", "chartType", "dimension", "metric", "aggregation"]
              }
            }
          },
          required: ["columns", "suggestions"]
        },
        systemInstruction: "You are a professional Business Intelligence (BI) architect. You suggest clever, highly insightful reporting setups based on spreadsheets."
      }
    });
    
    const responseText = response.text;
    if (!responseText) {
      throw new Error("No response text generated by Gemini");
    }
    
    const parsedData = JSON.parse(responseText.trim());
    return res.json(parsedData);
  } catch (error: any) {
    console.error("Gemini Analyze Column Error:", error);
    // Graceful fallback to rule-based suggestion so the UI never crashes
    return res.json({
      columns: req.body.headers.map((h: string) => ({ name: h, type: "categorical", description: "Values in column " + h })),
      suggestions: [
        {
          title: "General Distribution",
          description: "Summary visualization",
          chartType: "bar",
          dimension: req.body.headers[0],
          metric: req.body.headers[0],
          aggregation: "count"
        }
      ],
      warning: "AI suggestion experienced a transient issue. Fallback analytics generated instead."
    });
  }
});

// API: Generate narrative insights for a rendered chart view
app.post("/api/generate-insights", async (req, res) => {
  try {
    const { chartTitle, dimensionName, metricName, aggregationType, aggregatedData, columnDescriptions } = req.body;
    
    if (!aggregatedData || !Array.isArray(aggregatedData)) {
      return res.status(400).json({ error: "Aggregated data array is required" });
    }
    
    if (!ai) {
      return res.json({
        summary: `### Reporting Summary: ${chartTitle || "Custom Report"}\n\n* **Dimension Analyzed**: ${dimensionName}\n* **Metric Aggregate**: ${aggregationType ? aggregationType.toUpperCase() : ""}(${metricName || "Records"})\n* **Datapoints Count**: ${aggregatedData.length} records analyzed.\n\n*Configure a real GEMINI_API_KEY in Settings > Secrets to unlock full AI strategic narratives and automated KPI predictions for this report!*`
      });
    }
    
    const prompt = `Compose a short, highly professional, executive-level business insight summary for the following rendered report visualization:
Visual Title: "${chartTitle}"
Reporting Dimension: "${dimensionName}"
Analyzed Metric: "${metricName}" (Aggregated via: ${aggregationType})
Available Column Context: ${JSON.stringify(columnDescriptions || {})}

Aggregated Row Datapoints:
${JSON.stringify(aggregatedData.slice(0, 50))}

Give a brief analysis of the results:
- Outline the top 2-3 significant trends, notable gaps, skewness, or dominant segments.
- Formulate 2 tactical business recommendations or optimization ideas based on this dynamic query.
- Format with beautiful Markdown formatting (use markdown header, bulleted lists, bold highlights) and do not contain any references to database queries or technical code. Speak like an expert director of decision systems. Keep it under 250 words total.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an elite business decisions analyst and executive visual reporter."
      }
    });
    
    return res.json({
      summary: response.text || "No insights generated."
    });
  } catch (error: any) {
    console.error("Gemini Insights generation failed:", error);
    return res.json({
      summary: "### Query Performance Summary\n\n- Dataset aggregated successfully. AI narration is temporarily loading or facing a connection offset. Please check the charts visual layout above for direct trends!"
    });
  }
});

async function startServer() {
  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
