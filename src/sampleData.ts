export interface SampleDataset {
  name: string;
  description: string;
  rawCSV: string;
}

export const SAMPLE_DATASETS: SampleDataset[] = [
  {
    name: "Enterprise Sales & Channel Analytics",
    description: "Multidimensional company performance: Revenue, Ad Spend, Regional Sales, and Customer Ratings.",
    rawCSV: `Date,Region,Product Category,Sales Manager,Advertising Channel,Ad Spend,Revenue,Units Sold,Customer Rating
2026-01-10,North America,Electronics,Sarah Connor,Google Search,1200,8500,120,4.6
2026-01-12,Europe,Electronics,Hans Landa,Social Media,800,6400,90,4.2
2026-01-15,Asia-Pacific,Home Appliances,Chen Wei,Influencer,1500,12000,300,4.8
2026-01-18,North America,Furniture,Sarah Connor,Google Search,900,4500,45,3.9
2026-01-20,Europe,Furniture,Elena Rostova,Email Campaign,300,3100,30,4.5
2026-01-22,South America,Electronics,Carlos Ruiz,Social Media,500,4200,65,4.1
2026-02-01,North America,Electronics,Sarah Connor,Influencer,2000,14500,210,4.7
2026-02-05,Europe,Home Appliances,Hans Landa,Email Campaign,400,5800,140,4.4
2026-02-10,Asia-Pacific,Electronics,Chen Wei,Google Search,1100,9800,145,4.3
2026-02-15,South America,Home Appliances,Carlos Ruiz,Google Search,700,5100,115,4.0
2026-02-18,North America,Home Appliances,Sarah Connor,Social Media,1000,7900,180,4.6
2026-02-22,Europe,Electronics,Elena Rostova,Google Search,1300,9200,130,4.2
2026-02-25,Asia-Pacific,Furniture,Chen Wei,Social Media,900,6000,55,4.1
2026-03-01,North America,Furniture,Sarah Connor,Email Campaign,250,3800,38,4.3
2026-03-05,Europe,Electronics,Hans Landa,Influencer,1800,11100,160,4.8
2026-03-10,Asia-Pacific,Home Appliances,Chen Wei,Email Campaign,500,6800,165,4.5
2026-03-12,South America,Furniture,Carlos Ruiz,Social Media,600,4900,50,4.0
2026-03-15,North America,Electronics,Sarah Connor,Social Media,1100,9400,135,4.4
2026-03-20,Europe,Home Appliances,Elena Rostova,Social Media,950,7100,150,4.3
2026-03-24,Asia-Pacific,Electronics,Chen Wei,Google Search,1200,10500,155,4.6
2026-04-02,South America,Electronics,Carlos Ruiz,Email Campaign,350,3900,58,4.2
2026-04-05,North America,Home Appliances,Sarah Connor,Google Search,1400,11800,240,4.7
2026-04-10,Europe,Furniture,Hans Landa,Influencer,1600,8900,92,4.5
2026-04-15,Asia-Pacific,Electronics,Chen Wei,Email Campaign,450,7200,110,4.4
2026-04-18,South America,Home Appliances,Carlos Ruiz,Influencer,1200,9100,205,4.1`
  },
  {
    name: "SaaS Subscription & Client Engagement",
    description: "App platform telemetry tracking client signup volumes, support tickets, fee tiers, and churn states.",
    rawCSV: `Signup Date,Subscription Tier,Country,Monthly Fee,Logins Per Week,Feature Engagement,Support Tickets,Churned
2026-01-05,Enterprise,United States,499,35,88,1,No
2026-01-08,Pro,Germany,149,24,65,2,No
2026-01-12,Free,India,0,2,12,6,Yes
2026-01-15,Pro,United Kingdom,149,18,52,4,No
2026-01-19,Enterprise,Canada,499,42,95,0,No
2026-01-22,Free,Brazil,0,1,8,9,Yes
2026-01-26,Pro,India,149,22,60,3,No
2026-02-02,Pro,United States,149,25,58,2,No
2026-02-05,Free,France,0,3,15,5,No
2026-02-09,Enterprise,Germany,499,38,91,1,No
2026-02-12,Pro,Canada,149,19,48,3,Yes
2026-02-16,Free,United States,0,5,22,4,No
2026-02-20,Enterprise,India,499,40,94,2,No
2026-03-02,Free,United Kingdom,0,1,5,11,Yes
2026-03-05,Pro,Germany,149,26,72,1,No
2026-03-09,Pro,Brazil,149,15,41,5,No
2026-03-12,Enterprise,United States,499,45,98,0,No
2026-03-16,Free,India,0,4,19,4,No
2026-03-20,Pro,Canada,149,21,55,2,No
2026-03-25,Enterprise,Germany,499,39,87,3,No`
  },
  {
    name: "Global Engineering Project Logistics",
    description: "Infrastructure priority mapping: departmental budgets, task logs, cost variances, and days overdue.",
    rawCSV: `Project Name,Priority,Department,Task Count,Original Budget,Actual Spend,Days Overdue,Status
Titan Bridge,High,Civil Engineering,145,250000,275000,12,Delayed
Zephyr Windmill,Medium,Renewables,88,180000,165000,0,Completed
Apollo Solar Grid,High,Renewables,210,320000,345000,5,Completed
Mercury Airport Depot,Low,Logistics,64,95000,90000,0,Completed
Vulcan Pipeline,High,Energy Systems,120,410000,460000,28,Delayed
Aegis Cybersecurity,High,Software,150,150000,158000,4,Completed
Chimera Database,Medium,Software,75,80000,95000,18,In Progress
Atlas Storage Facility,Medium,Logistics,95,140000,135000,0,Completed
Hyperion Train Rail,High,Civil Engineering,320,750000,890000,45,Delayed
Janus Network Grid,Low,Software,40,35000,31000,0,Completed`
  },
  {
    name: "CBD Procurement & Supplier Savings",
    description: "Sample of actual sports item CBD contract values, supplier pricing, cost gaps, and active quantities.",
    rawCSV: `R3code FG,CBD ID,CBD status,Season,Industrial universe,country_name,dpp_name,FG supplier,section,type,designation,dsm_code,model_code,item_code,component supplier,Consumption unit,Consumption,Datacost unit price USD,PYC unit price USD,Gap $,Gap %,Quantity,Total Gap $
8649351,168142,Submitted by PIS,SS27,BAGS,INDIA,DP INDIA,KORRUN INDIA PRIVATE LIMITED,graphics,Riser KEY,9810020058 - WL RISER PAT QUECHUA NH*,9810020058,8613370,4528572,AD,pce,1.005,0.0172,0.0153,0.0019,12.61,116070,221.64
8649351,168142,Submitted by PIS,SS27,BAGS,INDIA,DP INDIA,KORRUN INDIA PRIVATE LIMITED,graphics,Riser LAPTOP,9810020058 - WL RISER PAT QUECHUA NH*,9810020058,8613370,4528570,AD,pce,1.005,0.0172,0.0153,0.0019,12.61,116070,221.64
8649351,168142,Submitted by PIS,SS27,BAGS,INDIA,DP INDIA,KORRUN INDIA PRIVATE LIMITED,graphics,Riser Phone,9810020058 - WL RISER PAT QUECHUA NH*,9810020058,8613370,4528565,AD,pce,1.005,0.0172,0.0153,0.0019,12.61,116070,221.64
8649351,168142,Submitted by PIS,SS27,BAGS,INDIA,DP INDIA,KORRUN INDIA PRIVATE LIMITED,graphics,Riser TAB,9810020058 - WL RISER PAT QUECHUA NH*,9810020058,8613370,4528587,AD,pce,1.005,0.0172,0.0153,0.0019,12.61,116070,221.64
8648869,168134,Reviewed challenge,SS27,BAGS,INDIA,DP INDIA,KORRUN INDIA PRIVATE LIMITED,sales packaging,carton,9810026956 - C2D rect AS1,9810026956,8742178,5197016,AD,pce,1.005,0.0191,0.0191,0.0000,-0.16,274050,0.00
8200579,167861,Submitted by PIS,SS27,BAGS,INDIA,DP INDIA,KORRUN INDIA PRIVATE LIMITED,accessories,Slider,8177221 - SLID COIL 4MM FREE,9808177221,8413085,47497,SBS / YKK,pce,1.005,0.0316,0.0307,0.0009,2.85,44101,39.89
8772113,168253,Submitted by PIS,SS27,BAGS,INDIA,DP INDIA,KORRUN INDIA PRIVATE LIMITED,leaflet / label,M14 - RFID Label,8167250 - Pocket Tag RFID,9808167250,8413660,1316097,AD,pce,1.005,0.05,0.0475,0.0025,5.26,110754,278.27
8734213,168184,Submitted by PIS,SS27,BAGS,INDIA,DP INDIA,KORRUN INDIA PRIVATE LIMITED,standard marking,RFID,8167250 - Pocket Tag RFID,9808167250,8413660,1316097,AD,pce,1.005,0.05,0.0475,0.0025,5.26,218400,548.73
8999005,168774,Submitted by PIS,SS27,BAGS,INDIA,DP INDIA,KORRUN INDIA PRIVATE LIMITED,marking / graphics,New Quechua Branding,9810054877 - WL 1F VER rPES,9810054877,9013492,5894958,AD,pce,1.005,0.0559,0.0499,0.0060,12.02,65341,394.01
8648869,168134,Reviewed challenge,SS27,BAGS,INDIA,DP INDIA,KORRUN INDIA PRIVATE LIMITED,accessories,elastic belt,9810027341 - EL FLW STD RPET,9810027341,8746501,4605275,ZX,m,1.1646,0.2605,0.2580,0.0025,0.97,274050,797.92
8999006,168777,Submitted by PIS,SS27,BAGS,INDIA,DP INDIA,KORRUN INDIA PRIVATE LIMITED,transport packaging,CARTON,9810009948 - EXB STD 600x400x400,9810009948,8534229,4361895,RPPL,pce,0.0837,1.0769,1.0072,0.0697,6.92,10000,697.00
8999005,168774,Submitted by PIS,SS27,BAGS,INDIA,DP INDIA,KORRUN INDIA PRIVATE LIMITED,transport packaging,CARTON,9810009948 - EXB STD 600x400x400,9810009948,8534229,4361895,RPPL,pce,0.0837,1.0769,1.0072,0.0697,6.92,65341,381.27
8200579,167861,Submitted by PIS,SS27,BAGS,INDIA,DP INDIA,KORRUN INDIA PRIVATE LIMITED,transport packaging,Box,9810009948 - EXB STD,9810009948,8534229,4361895,RPPL,pce,0.0131,1.0769,1.0072,0.0697,6.92,44101,40.16
8772113,168253,Submitted by PIS,SS27,BAGS,INDIA,DP INDIA,KORRUN INDIA PRIVATE LIMITED,transport packaging,Carton box,9810009948 - EXB,9810009948,8534229,4361895,RPPL,pce,0.0100,1.0769,1.0072,0.0697,6.92,110754,77.58`
  }
];
