import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
    return (
      TENS[ten] +
      (one === 0 && ten === 9 ? "s" : "") +
      (one > 0 ? "-" + ONES[10 + one] : ten === 9 ? "" : "")
    );
  }
  if (ten === 8) {
    return (
      "quatre-vingts" +
      (one > 0 ? "-" + ONES[one] : "").replace(
        "quatre-vingts-",
        "quatre-vingt-",
      )
    );
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
    const d = new Date(inv.date).getDate();
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

function drawInfoBlock(doc, info, x, y, lineH = 6) {
  const fields = [
    ["DRSP", info.drsp],
    ["SDSP", info.sdsp],
    ["CSB", info.csb],
    ["ANNEE", info.annee],
    ["MOIS", info.mois],
  ];

  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);

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

export function exportPDF({
  yearMonth,
  invoices,
  totalAmount,
  totalPatients,
  totalOrdonnances,
  info,
}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth(); // 210 mm
  const pageH = doc.internal.pageSize.getHeight(); // 297 mm

  // ── Build all table rows first so we know row count ──
  const tableRows = buildTableRows(yearMonth, invoices);
  tableRows.push([
    "TOTAL",
    String(totalPatients),
    String(totalOrdonnances),
    fmtAmount(totalAmount),
  ]);

  const rowCount = tableRows.length; // typically 30-31 data rows + 1 TOTAL

  // ── Estimate content height at nominal scale (margin = 15) ──
  // Logo + title + rule:       14 + 3 + 9 + 7        ≈ 33 mm
  // Info block (5 lines × 6): 30 mm
  // Table header:              ~8 mm
  // Table rows (each ~6.5mm):  rowCount × 6.5
  // Arrêté text (~10 mm):      10 mm
  // Signature section:         12 mm
  // Top + bottom margin:       15 × 2 = 30 mm
  const NOMINAL_MARGIN = 15;
  const HEADER_BLOCK = 33;
  const INFO_BLOCK = 30;
  const TABLE_HEAD = 8;
  const ROW_H_NOMINAL = 6.5;
  const FOOTER_BLOCK = 22; // arrêté + signatures
  const estimatedH =
    NOMINAL_MARGIN * 2 +
    HEADER_BLOCK +
    INFO_BLOCK +
    TABLE_HEAD +
    rowCount * ROW_H_NOMINAL +
    FOOTER_BLOCK;

  // Scale factor: shrink everything proportionally if content exceeds page
  const scale = Math.min(1, (pageH - 4) / estimatedH); // 4 mm safety buffer
  const margin = NOMINAL_MARGIN * scale;
  const rowH = ROW_H_NOMINAL * scale;

  // Scaled font sizes
  const fzTitle = Math.max(7, 13 * scale);
  const fzInfo = Math.max(6, 9 * scale);
  const fzTable = Math.max(5, 8 * scale);
  const fzHead = Math.max(5, 8.5 * scale);
  const fzFoot = Math.max(5, 9 * scale);
  const cellPad = Math.max(1, 2.5 * scale);
  const lineH = fzInfo * 0.352778 + 1.2; // pt → mm + spacing

  let y = margin;

  //   // ── Logo ──
  //   y = drawLogo(doc, pageW / 2, y, 14 * scale);

  // ── Main Title ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(fzTitle);
  doc.setTextColor(30, 30, 30);
  doc.text("FACTURE COUVERTURE DE SOINS", pageW / 2, y, { align: "center" });
  y += fzTitle * 0.352778 + 3 * scale;

  // ── Thin rule ──
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 4 * scale;

  // ── Info block ──
  const [yr, mo] = yearMonth.split("-");
  const monthLabel = new Date(yr, mo - 1).toLocaleDateString("fr-FR", {
    month: "long",
  });

  doc.setFontSize(fzInfo);
  drawInfoBlock(
    doc,
    {
      ...info,
      annee: yr,
      mois: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
    },
    margin,
    y,
    lineH,
  );

  y += 5 * lineH + 3 * scale; // 5 info lines + small gap

  // ── Table ──
  autoTable(doc, {
    startY: y,
    head: [["Date", "Nombre de patients", "Nombre OF", "Montant (Ar)"]],
    body: tableRows,
    margin: { left: margin, right: margin },
    tableWidth: pageW - 2 * margin,
    styles: {
      fontSize: fzTable,
      cellPadding: cellPad,
      lineColor: [220, 220, 220],
      lineWidth: 0.2,
      textColor: [40, 40, 40],
      minCellHeight: rowH,
    },
    headStyles: {
      fillColor: [82, 197, 193],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: fzHead,
    },
    // TOTAL row styling
    didParseCell(data) {
      if (data.section === "body" && data.row.index === tableRows.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [240, 250, 250];
        data.cell.styles.textColor = [40, 130, 127];
      }
    },
    columnStyles: {
      0: { cellWidth: 14 * scale, halign: "center" },
      1: { cellWidth: 46 * scale, halign: "center" },
      2: { cellWidth: 30 * scale, halign: "center" },
      3: { cellWidth: "auto", halign: "right" },
    },
  });

  y = doc.lastAutoTable.finalY + 5 * scale;

  // ── Arrêté ──
  const amountWords = numberToFrenchWords(totalAmount);
  const arreteText = `Arrêté le présent montant à la somme de : ${amountWords} Ariary`;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(fzFoot);
  doc.setTextColor(40, 40, 40);
  const splitText = doc.splitTextToSize(arreteText, pageW - 2 * margin);
  doc.text(splitText, margin, y);
  y += splitText.length * (fzFoot * 0.352778 + 1) + 8 * scale;

  // ── Signatures ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(fzFoot);
  doc.setTextColor(40, 40, 40);

  const sigLabels = ["Chef CSB", "Représentant CoGe", "APF"];
  const positions = [margin, pageW / 2, pageW - margin];
  const aligns = ["left", "center", "right"];

  sigLabels.forEach((label, i) => {
    doc.text(label, positions[i], y, { align: aligns[i] });
  });
  y += 4 * scale;

  // Signature lines
  doc.setDrawColor(160, 160, 160);
  doc.setLineWidth(0.3);
  const lineLen = 40 * scale;
  doc.line(margin, y, margin + lineLen, y);
  doc.line(pageW / 2 - lineLen / 2, y, pageW / 2 + lineLen / 2, y);
  doc.line(pageW - margin - lineLen, y, pageW - margin, y);

  // ── Save ──
  const filename = `facture_${yearMonth}_${(info.csb || "tatero").replace(/\s+/g, "_")}.pdf`;
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
    ["DRSP", info.drsp || ""],
    ["SDSP", info.sdsp || ""],
    ["CSB", info.csb || ""],
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
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"),
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
