import * as fs from "fs";
import * as path from "path";

export interface MdDeliveryLog {
  deliveryId: string;
  beneficiaryId: string;
  driverId: string;
  orderIndex: number;
  clusterId: number;
  eta: string | Date | null;
  distance: number | null;
  portion: number;
  type: string;
  lat?: string | null;
  lon?: string | null;
}

interface MdOptions {
  driverName: string;
  kitchenId: string;
  menuPlanId: string;
  date?: string;
}

export default function generateDeliveryMarkdownFull(
  results: MdDeliveryLog[],
  options: MdOptions
): string {

  const now = new Date();
  const fileName = `delivery-log-full-${options.driverName}-${now.getTime()}.md`;
  const logsDir = path.join(process.cwd(), "logs");
  const filePath = path.join(logsDir, fileName);

  // ensure folder
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
  }

  const sorted = results.sort((a, b) => a.orderIndex - b.orderIndex);

  let md = `
# 🚚 FULL DELIVERY LOG — PICKUP + DROPOFF
Driver: **${options.driverName}**

📅 Date: ${options.date ?? now.toISOString().slice(0, 10)}
🍳 Kitchen ID: ${options.kitchenId}
📋 Menu Plan ID: ${options.menuPlanId}

---

## 🧾 OVERVIEW
- Total Deliveries (records): ${sorted.length}
- Route Start: ${sorted[0]?.eta ?? "N/A"}
- Route End: ${sorted[sorted.length - 1]?.eta ?? "N/A"}

---
`;

  sorted.forEach((res, idx) => {

    md += `
## 📦 DELIVERY #${idx + 1}

### 🟦 PICKUP
Pickup ID (simulated): **${res.deliveryId}-P**
\`\`\`
Driver                : ${res.driverId}
ClusterId             : ${res.clusterId}
OrderIndex            : ${res.orderIndex}
ETA Pickup Time       : ${res.eta}
Portion               : ${res.portion}
Type                  : ${res.type}
Distance Kitchen→Node : ${res.distance} km
Location Lat/Lon      : ${res.lat ?? "--"}, ${res.lon ?? "--"}
\`\`\`

### 🟥 DROPOFF
Dropoff ID (simulated): **${res.deliveryId}-D**
\`\`\`
Beneficiary ID        : ${res.beneficiaryId}
Driver                : ${res.driverId}
OrderIndex            : ${res.orderIndex}
ETA Dropoff Time      : ${res.eta}
Portion Delivered     : ${res.portion}
Meal Type             : ${res.type}
Distance Prev→Node    : ${res.distance} km
Location Lat/Lon      : ${res.lat ?? "--"}, ${res.lon ?? "--"}
\`\`\`

### 🔄 ROUTE FLOW
\`\`\`
Kitchen → Pickup → Dropoff → Next Pickup
\`\`\`

---
`;
  });

  md += `
## 📁 RAW JSON DATA
\`\`\`json
${JSON.stringify(results, null, 2)}
\`\`\`
`;

  fs.writeFileSync(filePath, md, "utf8");

  return filePath;
}
