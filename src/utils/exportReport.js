import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import XLSX from "xlsx-js-style";

const FORMULA_PREFIX_REGEX = /^[\s\u00A0]*[=+\-@\t\r]/;

function sanitizeSpreadsheetText(value) {
  if (value === undefined || value === null) return "";
  const str = String(value);
  return FORMULA_PREFIX_REGEX.test(str) ? `'${str}` : str;
}

function sanitizeStockCell(value) {
  if (value === undefined || value === null || value === "") return "";
  const num = Number(value);
  if (Number.isFinite(num)) return num;
  return sanitizeSpreadsheetText(value);
}

/* =========================================================
   NUMBER → FRENCH WORDS  (for Ariary total)
   ========================================================= */

const ONES = [
  "",
  "un",
  "deux",
  "trois",
  "quatre",
  "cinq",
  "six",
  "sept",
  "huit",
  "neuf",
  "dix",
  "onze",
  "douze",
  "treize",
  "quatorze",
  "quinze",
  "seize",
  "dix-sept",
  "dix-huit",
  "dix-neuf",
];
const TENS = [
  "",
  "",
  "vingt",
  "trente",
  "quarante",
  "cinquante",
  "soixante",
  "soixante",
  "quatre-vingt",
  "quatre-vingt",
];

function below100(n) {
  if (n < 20) return ONES[n];
  const ten = Math.floor(n / 10);
  const one = n % 10;
  if (ten === 7 || ten === 9) {
    const unit = ONES[10 + one];
    if (ten === 7 && one === 1) {
      return `${TENS[ten]}-et-${unit}`;
    }
    return `${TENS[ten]}-${unit}`;
  }
  if (ten === 8) {
    return one === 0 ? "quatre-vingts" : `quatre-vingt-${ONES[one]}`;
  }
  return (
    TENS[ten] +
    (one === 1 && ten !== 8
      ? "-et-" + ONES[one]
      : one > 0
        ? "-" + ONES[one]
        : "")
  );
}

function below1000(n) {
  if (n < 100) return below100(n);
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const prefix =
    hundreds === 1
      ? "cent"
      : ONES[hundreds] + " cent" + (rest === 0 && hundreds > 1 ? "s" : "");
  return rest === 0 ? prefix : prefix + " " + below100(rest);
}

export function numberToFrenchWords(n) {
  if (n === 0) return "zéro";
  const integer = Math.floor(Math.abs(n));
  const parts = [];

  const billions = Math.floor(integer / 1_000_000_000);
  const millions = Math.floor((integer % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((integer % 1_000_000) / 1_000);
  const remainder = integer % 1_000;

  if (billions > 0)
    parts.push(
      below1000(billions) + (billions === 1 ? " milliard" : " milliards"),
    );
  if (millions > 0)
    parts.push(
      below1000(millions) + (millions === 1 ? " million" : " millions"),
    );
  if (thousands > 0)
    parts.push(thousands === 1 ? "mille" : below1000(thousands) + " mille");
  if (remainder > 0) parts.push(below1000(remainder));

  return parts.join(" ");
}

/* =========================================================
   FORMAT AMOUNT  — regular space as thousands separator
   (jsPDF cannot render fr-FR narrow no-break space \u202f)
   ========================================================= */

function fmtAmount(n) {
  // Build "1 234 567" with plain ASCII space
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/* =========================================================
   BUILD TABLE ROWS  (day 1 → N, all days, weekdays filled)
   ========================================================= */

function buildTableRows(yearMonth, invoices) {
  const [year, month] = yearMonth.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();

  const byDay = {};
  invoices.forEach((inv) => {
    const dateKey = String(inv.date || "").slice(0, 10);
    const dayPart = Number(dateKey.split("-")[2]);
    const d = Number.isInteger(dayPart) && dayPart > 0 ? dayPart : new Date(inv.date).getDate();
    byDay[d] = inv;
  });

  const rows = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const inv = byDay[day];
    rows.push(
      inv
        ? [
            String(day),
            String(inv.nbP),
            String(inv.nbOf),
            fmtAmount(inv.amount),
          ]
        : [String(day), "", "", ""],
    );
  }
  return rows;
}

function toDateOnly(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatShortDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function buildWeeklyDates(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) {
    return [];
  }

  const end = endDate ? new Date(`${endDate}T00:00:00`) : null;
  if (!end || Number.isNaN(end.getTime()) || end < start) {
    return Array.from({ length: 5 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }

  const diffDays = Math.min(
    31,
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
  );

  return Array.from({ length: diffDays }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

export function exportWeeklyReportXLSX({
  startDate,
  endDate,
  invoices = [],
  user = {},
  exportData = {},
}) {
  const weeklyDates = buildWeeklyDates(startDate, endDate);
  const invoiceMap = new Map(
    invoices.map((invoice) => [toDateOnly(invoice.date), invoice]),
  );

  const getNumericCellValue = (invoice, field, roundValue = false) => {
    if (!invoice || invoice[field] === undefined || invoice[field] === null) {
      return "";
    }

    const value = Number(invoice[field]);
    if (!Number.isFinite(value)) return "";
    return roundValue ? Math.round(value) : value;
  };

  const csbValue = sanitizeSpreadsheetText(String(exportData.csb ?? user.workAt ?? "").trim());
  const districtValue = sanitizeSpreadsheetText(exportData.district ?? "NOSY-VARIKA");
  const apfNameValue = sanitizeSpreadsheetText(user.name || user.fullName || "");
  const intrantsValue = sanitizeSpreadsheetText(exportData.intrants || "");

  const stock = {
    OF: sanitizeStockCell(exportData.stock?.OF),
    RCS: sanitizeStockCell(exportData.stock?.RCS),
    ticketBlanc: sanitizeStockCell(exportData.stock?.ticketBlanc),
    ticketBleu: sanitizeStockCell(exportData.stock?.ticketBleu),
    preRUMER: sanitizeStockCell(exportData.stock?.preRUMER),
  };

  const rows = [
    ["Rapport hebdomadaire du projet Couverture de soins au niveau CSB"],
    ["District:", districtValue],
    ["CSB:", csbValue],
    ["Nom et prénom (s) de l'APF:", apfNameValue],
    [],
    [],
    ["FACTURES"],
    ["", ...weeklyDates.map((date) => formatShortDate(date))],
    [
      "Montant de la facture journalière",
      ...weeklyDates.map((date) =>
        getNumericCellValue(invoiceMap.get(toDateOnly(date)), "amount", true),
      ),
    ],
    [
      "Nombre de patients ayant reçu des tickets",
      ...weeklyDates.map((date) =>
        getNumericCellValue(invoiceMap.get(toDateOnly(date)), "nbP"),
      ),
    ],
    [
      "Nombre OF",
      ...weeklyDates.map((date) =>
        getNumericCellValue(invoiceMap.get(toDateOnly(date)), "nbOf"),
      ),
    ],
    [
      "Coût moyen",
      ...weeklyDates.map((date) =>
        getNumericCellValue(invoiceMap.get(toDateOnly(date)), "averageCost", true),
      ),
    ],
    [
      "Remarque",
      ...weeklyDates.map((date) =>
        sanitizeSpreadsheetText(invoiceMap.get(toDateOnly(date))?.comment || ""),
      ),
    ],
    ["Intrants rupture à la PhaGeCom", intrantsValue],
    [],
    [],
    ["OUTILS DE GESTION"],
    ["", "OF", "RCS", "Ticket blanc", "Ticket bleu", "PreRUMER"],
    [
      "Quantité en stock",
      stock.OF,
      stock.RCS,
      stock.ticketBlanc,
      stock.ticketBleu,
      stock.preRUMER,
    ],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const maxInvoiceCol = Math.max(5, weeklyDates.length);

  const thinBorder = {
    top: { style: "thin", color: { rgb: "000000" } },
    bottom: { style: "thin", color: { rgb: "000000" } },
    left: { style: "thin", color: { rgb: "000000" } },
    right: { style: "thin", color: { rgb: "000000" } },
  };

  const ensureCell = (r, c) => {
    const addr = XLSX.utils.encode_cell({ r, c });
    if (!worksheet[addr]) {
      worksheet[addr] = { t: "s", v: "" };
    }
    return worksheet[addr];
  };

  const applyCellStyle = (r, c, style) => {
    const cell = ensureCell(r, c);
    cell.s = {
      ...(cell.s || {}),
      ...style,
    };
  };

  // 1. Merge A1:F1, center align, bold text
  worksheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];
  for (let c = 0; c <= 5; c++) {
    applyCellStyle(0, c, {
      font: { bold: true, sz: 12 },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
    });
  }

  // 2. Make A2:A4 bold text
  for (let r = 1; r <= 3; r++) {
    applyCellStyle(r, 0, {
      font: { bold: true },
    });
  }

  // 3. Make A7 bold text and uppercase ("FACTURES")
  applyCellStyle(6, 0, {
    font: { bold: true },
  });

  // 4. Add table border to A8:F14 (and any extra date columns if range > 5 days)
  for (let r = 7; r <= 13; r++) {
    for (let c = 0; c <= maxInvoiceCol; c++) {
      const style = { border: thinBorder };
      if (r === 7 && c > 0) {
        style.font = { bold: true };
        style.alignment = { horizontal: "center", vertical: "center" };
      }
      applyCellStyle(r, c, style);
    }
  }

  // 5. Highlight high averageCost cells (> 3500) on row 12 (r = 11)
  for (let c = 1; c <= maxInvoiceCol; c++) {
    const addr = XLSX.utils.encode_cell({ r: 11, c });
    const cell = worksheet[addr];
    if (cell && typeof cell.v === "number" && cell.v > 3500) {
      applyCellStyle(11, c, {
        fill: { patternType: "solid", fgColor: { rgb: "FEE2E2" } },
        font: { bold: true, color: { rgb: "B91C1C" } },
      });
    }
  }

  // 6. Make A17 bold text and uppercase ("OUTILS DE GESTION")
  applyCellStyle(16, 0, {
    font: { bold: true },
  });

  // 7. Add table border to A18:F19
  for (let r = 17; r <= 18; r++) {
    for (let c = 0; c <= 5; c++) {
      const style = { border: thinBorder };
      if (r === 17 && c > 0) {
        style.font = { bold: true };
        style.alignment = { horizontal: "center", vertical: "center" };
      }
      applyCellStyle(r, c, style);
    }
  }

  worksheet["!ref"] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: 18, c: maxInvoiceCol },
  });
  worksheet["!rows"] = [{ hpt: 24 }];
  worksheet["!cols"] = [
    { wch: 38 },
    ...Array.from({ length: maxInvoiceCol }, () => ({ wch: 18 })),
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Rapport hebdo");

  // 8. Prefix export filename with CSB value
  const sanitizedCsb = String(exportData.csb ?? user.workAt ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const csbPrefix = sanitizedCsb ? `${sanitizedCsb}_` : "";
  const filename = `${csbPrefix}rapport_hebdo_${startDate}_au_${endDate || startDate}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/* =========================================================
   DRAW LOGO (bar-chart icon, brand teal)
   ========================================================= */

// function drawLogo(doc, cx, y, size = 14) {
//     const barW    = size * 0.18;
//     const gap     = size * 0.12;
//     const heights = [0.5, 1, 0.7];
//     const totalW  = 3 * barW + 2 * gap;
//     const startX  = cx - totalW / 2;

//     doc.setFillColor(82, 197, 193);
//     heights.forEach((h, i) => {
//         const bh = size * h;
//         const bx = startX + i * (barW + gap);
//         const by = y + size - bh;
//         doc.roundedRect(bx, by, barW, bh, 1, 1, "F");
//     });
//     return y + size + 3;
// }

/* =========================================================
   DRAW INFO BLOCK  (left column: DRSP, SDSP, CSB…)
   ========================================================= */

async function loadImageAsset(src) {
  if (typeof window === "undefined") return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve({
          dataUrl: canvas.toDataURL("image/png"),
          width: canvas.width,
          height: canvas.height,
        });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/* =========================================================
   DRAW INFO BLOCK  (left column: DRSP, SDSP, CSB…)
   ========================================================= */

function drawInfoBlock(doc, info, x, y, lineH = 5.5) {
  const fields = [
    ["DRSP", info.drsp || "VATOVAVY"],
    ["SDSP", info.sdsp || "NOSY-VARIKA"],
    ["CSB", info.csb || ""],
    ["ANNEE", info.annee],
    ["MOIS", info.mois],
  ];

  doc.setTextColor(40, 40, 40);

  fields.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label} :`, x, y);
    doc.setFont("helvetica", "normal");
    doc.text(` ${value || ""}`, x + doc.getTextWidth(`${label} :`), y);
    y += lineH;
  });
  return y;
}

/* =========================================================
   PDF EXPORT  — guaranteed single page
   ========================================================= */

export async function exportPDF({
  yearMonth,
  invoices,
  totalAmount,
  totalPatients,
  totalOrdonnances,
  info = {},
}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth(); // 210 mm
  const pageH = doc.internal.pageSize.getHeight(); // 297 mm

  const [msanpLogo, pivotLogo] = await Promise.all([
    loadImageAsset("/assets/aistudio/logo_msanp_45132971.png"),
    loadImageAsset("/assets/aistudio/logo_pivot_a7ca9c9b.png"),
  ]);

  // ── Build all table rows first so we know row count ──
  const tableRows = buildTableRows(yearMonth, invoices);
  tableRows.push([
    "TOTAL",
    String(totalPatients),
    String(totalOrdonnances),
    fmtAmount(totalAmount),
  ]);

  const rowCount = tableRows.length; // typically 29-31 data rows + 1 TOTAL

  // ── Estimate content height at nominal scale so everything fits on 1 A4 page ──
  const NOMINAL_MARGIN = 11;
  const HEADER_BLOCK = 22;
  const INFO_BLOCK = 28;
  const TABLE_HEAD = 7;
  const ROW_H_NOMINAL = 5.2;
  const FOOTER_BLOCK = 24; // arrêté + signatures
  const estimatedH =
    NOMINAL_MARGIN * 2 +
    HEADER_BLOCK +
    INFO_BLOCK +
    TABLE_HEAD +
    rowCount * ROW_H_NOMINAL +
    FOOTER_BLOCK;

  const scale = Math.min(1, (pageH - 4) / estimatedH);
  const margin = NOMINAL_MARGIN * scale;
  const rowH = ROW_H_NOMINAL * scale;

  const fzTitle = Math.max(8, 13 * scale);
  const fzInfo = Math.max(6.5, 9 * scale);
  const fzTable = Math.max(5.5, 8 * scale);
  const fzHead = Math.max(5.5, 8.5 * scale);
  const fzFoot = Math.max(6, 9 * scale);
  const cellPad = Math.max(0.9, 1.35 * scale);
  const lineH = fzInfo * 0.352778 + 1.3 * scale;

  let y = margin;

  // ── Top header: Left logo_msanp, Center title, Right logo_pivot ──
  const logoH = 15 * scale;
  if (msanpLogo) {
    const logoW = logoH * (msanpLogo.width / msanpLogo.height);
    doc.addImage(msanpLogo.dataUrl, "PNG", margin, y, logoW, logoH, undefined, "FAST");
  }
  if (pivotLogo) {
    const logoW = logoH * (pivotLogo.width / pivotLogo.height);
    doc.addImage(pivotLogo.dataUrl, "PNG", pageW - margin - logoW, y, logoW, logoH, undefined, "FAST");
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(fzTitle);
  doc.setTextColor(15, 23, 42);
  doc.text("FACTURE COUVERTURE DE SOINS", pageW / 2, y + logoH / 2, {
    align: "center",
    baseline: "middle",
  });

  y += logoH + 3 * scale;

  // ── Thin rule ──
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 4.5 * scale;

  // ── Info block (left side) ──
  const [yr, mo] = yearMonth.split("-");
  const monthLabel = new Date(Number(yr), Number(mo) - 1, 1).toLocaleDateString("fr-FR", {
    month: "long",
  });

  doc.setFontSize(fzInfo);
  y = drawInfoBlock(
    doc,
    {
      drsp: info.drsp || "VATOVAVY",
      sdsp: info.sdsp || "NOSY-VARIKA",
      csb: info.csb || "",
      annee: yr,
      mois: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
    },
    margin,
    y,
    lineH,
  );

  y += 2 * scale;

  // ── Table ──
  autoTable(doc, {
    startY: y,
    head: [["Date", "Nombre Patient", "Nombre OF", "Montant"]],
    body: tableRows,
    margin: { left: margin, right: margin },
    tableWidth: pageW - 2 * margin,
    styles: {
      fontSize: fzTable,
      cellPadding: cellPad,
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
      textColor: [30, 41, 59],
      minCellHeight: rowH,
      valign: "middle",
    },
    headStyles: {
      fillColor: [15, 98, 88],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: fzHead,
      halign: "center",
    },
    didParseCell(data) {
      if (data.section === "body" && data.row.index === tableRows.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [238, 246, 245];
        data.cell.styles.textColor = [15, 98, 88];
      }
    },
    columnStyles: {
      0: { cellWidth: 20 * scale, halign: "center" },
      1: { cellWidth: 48 * scale, halign: "center" },
      2: { cellWidth: 44 * scale, halign: "center" },
      3: { cellWidth: "auto", halign: "right" },
    },
  });

  y = doc.lastAutoTable.finalY + 5 * scale;

  // ── Arrêté ──
  const roundedTotal = Math.round(Number(totalAmount) || 0);
  const amountWordsUpper = numberToFrenchWords(roundedTotal).toUpperCase();
  const arreteText = `Arrêté le présent montant à la somme de : ${amountWordsUpper} ARIARY`;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(fzFoot);
  doc.setTextColor(15, 23, 42);
  const splitText = doc.splitTextToSize(arreteText, pageW - 2 * margin);
  doc.text(splitText, margin, y);
  y += splitText.length * (fzFoot * 0.352778 + 1.2) + 8 * scale;

  // ── Signatures (last line: Left Chef CSB, Center Représentant CoGe, Right APF) ──
  const signatureY = Math.min(pageH - margin - 6 * scale, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(fzFoot);
  doc.setTextColor(30, 41, 59);

  const sigLabels = ["Chef CSB", "Représentant CoGe", "APF"];
  const positions = [margin, pageW / 2, pageW - margin];
  const aligns = ["left", "center", "right"];

  sigLabels.forEach((label, i) => {
    doc.text(label, positions[i], signatureY, { align: aligns[i] });
  });

  const lineY = signatureY + 4 * scale;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  const lineLen = 38 * scale;
  doc.line(margin, lineY, margin + lineLen, lineY);
  doc.line(pageW / 2 - lineLen / 2, lineY, pageW / 2 + lineLen / 2, lineY);
  doc.line(pageW - margin - lineLen, lineY, pageW - margin, lineY);

  // ── Save ──
  const csbSlug = String(info.csb || "tatero")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const filename = `facture_${yearMonth}_${csbSlug || "tatero"}.pdf`;
  doc.save(filename);
}

/* =========================================================
   CSV EXPORT
   ========================================================= */

export function exportCSV({
  yearMonth,
  invoices,
  totalAmount,
  totalPatients,
  totalOrdonnances,
  info,
}) {
  const [yr, mo] = yearMonth.split("-");
  const monthLabel = new Date(yr, mo - 1).toLocaleDateString("fr-FR", {
    month: "long",
  });

  const rows = [
    ["FACTURE COUVERTURE DE SOINS"],
    [],
    ["DRSP", sanitizeSpreadsheetText(info.drsp || "")],
    ["SDSP", sanitizeSpreadsheetText(info.sdsp || "")],
    ["CSB", sanitizeSpreadsheetText(info.csb || "")],
    ["ANNEE", yr],
    ["MOIS", monthLabel],
    [],
    ["Date", "Nombre de patients", "Nombre OF", "Montant (Ar)"],
  ];

  const tableRows = buildTableRows(yearMonth, invoices);
  tableRows.forEach((r) => rows.push(r));
  rows.push([
    "TOTAL",
    String(totalPatients),
    String(totalOrdonnances),
    fmtAmount(totalAmount),
  ]);
  rows.push([]);
  rows.push([
    `Arrêté le présent montant à la somme de : ${numberToFrenchWords(totalAmount)} Ariary`,
  ]);
  rows.push([]);
  rows.push(["Chef CSB", "Représentant CoGe", "APF"]);

  const csv = rows
    .map((row) =>
      row
        .map((cell) => `"${sanitizeSpreadsheetText(cell).replace(/"/g, '""')}"`)
        .join(";"),
    )
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `facture_${yearMonth}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
