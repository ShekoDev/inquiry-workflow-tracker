import * as XLSX from 'xlsx';
import { logActivity } from '@/services/activityLog';

const COPYRIGHT = 'جميع حقوق الملكية محفوظة لمحمود شهاب';
const stamp = () => new Date().toISOString().slice(0, 10);

export interface DocMeta {
  /** company name printed at the top */
  company?: string;
  /** report title */
  title: string;
  /** optional line under the title */
  subtitle?: string;
  /** label → value pairs printed in the info block (period, filters, who generated it) */
  info?: { label: string; value: string }[];
  dir?: 'rtl' | 'ltr';
  lang?: 'ar' | 'en';
}

// ============================================================================
// Excel
// ============================================================================

/** widen every column to fit its longest cell, so nothing shows as ##### */
function autoWidth(rows: Record<string, unknown>[], headers: string[]) {
  return headers.map(h => {
    const longest = rows.reduce((max, r) => Math.max(max, String(r[h] ?? '').length), h.length);
    return { wch: Math.min(48, Math.max(10, longest + 3)) };
  });
}

/**
 * A presentable workbook: a title band, the generation info, a bold frozen header row,
 * auto-filter, sized columns and RTL sheet direction for Arabic.
 */
export function exportRowsToExcel(rows: Record<string, unknown>[], fileBase: string, sheetName = 'Sheet1', meta?: DocMeta) {
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const rtl = (meta?.dir ?? (/[؀-ۿ]/.test(sheetName) ? 'rtl' : 'ltr')) === 'rtl';
  const lang = meta?.lang || (rtl ? 'ar' : 'en');

  const titleRows: (string | number)[][] = [];
  titleRows.push([meta?.company || (lang === 'ar' ? 'شركة تجريبية للمقاولات' : 'Demo Contracting Co.')]);
  titleRows.push([meta?.title || sheetName]);
  if (meta?.subtitle) titleRows.push([meta.subtitle]);
  const infoLine = [
    ...(meta?.info || []).map(i => `${i.label}: ${i.value}`),
    `${lang === 'ar' ? 'تاريخ الإصدار' : 'Generated'}: ${new Date().toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-GB')}`,
    `${lang === 'ar' ? 'عدد الصفوف' : 'Rows'}: ${rows.length}`
  ].join('   |   ');
  titleRows.push([infoLine]);
  titleRows.push([]);

  const ws = XLSX.utils.aoa_to_sheet(titleRows);
  XLSX.utils.sheet_add_json(ws, rows, { origin: `A${titleRows.length + 1}`, header: headers.length ? headers : undefined });

  const headerRowIdx = titleRows.length; // 0-based row of the header
  const lastCol = Math.max(0, headers.length - 1);
  const lastRow = headerRowIdx + rows.length;

  // merge the title band across the table width
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } },
    ...(meta?.subtitle ? [{ s: { r: 2, c: 0 }, e: { r: 2, c: lastCol } }] : []),
    { s: { r: titleRows.length - 2, c: 0 }, e: { r: titleRows.length - 2, c: lastCol } }
  ];

  ws['!cols'] = autoWidth(rows, headers);
  ws['!rows'] = [{ hpt: 24 }, { hpt: 20 }];
  ws['!freeze'] = { xSplit: 0, ySplit: headerRowIdx + 1 };
  (ws as any)['!autofilter'] = headers.length ? { ref: XLSX.utils.encode_range({ s: { r: headerRowIdx, c: 0 }, e: { r: lastRow, c: lastCol } }) } : undefined;

  // cell styling — honoured by Excel/LibreOffice; harmless where unsupported
  const style = (addr: string, s: Record<string, unknown>) => { if (ws[addr]) (ws[addr] as any).s = s; };
  style('A1', { font: { bold: true, sz: 14, color: { rgb: '1E3A5F' } }, alignment: { horizontal: 'center' } });
  style('A2', { font: { bold: true, sz: 12 }, alignment: { horizontal: 'center' } });
  style(`A${titleRows.length - 1}`, { font: { sz: 9, color: { rgb: '666666' } }, alignment: { horizontal: 'center' } });
  headers.forEach((_, c) => style(XLSX.utils.encode_cell({ r: headerRowIdx, c }), {
    font: { bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '1E3A5F' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31));
  if (rtl) (wb.Workbook ||= {}).Views = [{ RTL: true }];
  wb.Props = { Title: meta?.title || sheetName, Company: meta?.company || 'Demo Co.', Author: COPYRIGHT, CreatedDate: new Date() };

  XLSX.writeFile(wb, `${fileBase}_${stamp()}.xlsx`, { cellStyles: true });
  logActivity({
    action: 'EXPORT', module: 'reports', recordLabel: fileBase, newValue: rows.length,
    descriptionAr: `تصدير ${meta?.title || fileBase} إلى Excel (${rows.length} صف)`,
    descriptionEn: `Exported ${meta?.title || fileBase} to Excel (${rows.length} rows)`
  });
}

// ============================================================================
// PDF (via the browser's own print engine — the only reliable way to get Arabic right)
// ============================================================================

export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

export function tableHtml(headers: string[], rows: (string | number)[][], opts?: { numericCols?: number[]; totals?: (string | number)[] }) {
  const num = new Set(opts?.numericCols || []);
  const head = `<thead><tr>${headers.map((h, i) => `<th${num.has(i) ? ' class="num"' : ''}>${esc(h)}</th>`).join('')}</tr></thead>`;
  const body = `<tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td${num.has(i) ? ' class="num"' : ''}>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>`;
  const foot = opts?.totals ? `<tfoot><tr>${opts.totals.map((c, i) => `<td${num.has(i) ? ' class="num"' : ''}>${esc(c)}</td>`).join('')}</tr></tfoot>` : '';
  return `<table>${head}${body}${foot}</table>`;
}

/** small coloured pill, e.g. for a status column inside a printed table */
export function pill(text: string, color: string) {
  return `<span class="pill" style="background:${color}1A;color:${color};border-color:${color}55">${esc(text)}</span>`;
}

/** key/value cards printed under the title — the "who / when / which filters" block */
function infoBlock(info: { label: string; value: string }[]) {
  if (!info.length) return '';
  return `<div class="info">${info.map(i => `<div class="info-item"><span class="k">${esc(i.label)}</span><span class="v">${esc(i.value)}</span></div>`).join('')}</div>`;
}

const PRINT_CSS = (dir: 'rtl' | 'ltr') => `
  @page { size: A4 landscape; margin: 14mm 10mm 16mm 10mm; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Segoe UI','Cairo','Noto Naskh Arabic',Tahoma,sans-serif;
    font-size: 10.5px; color: #1f2937; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .sheet { padding: 0; }
  header.doc {
    display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
    border-bottom: 2.5px solid #1E3A5F; padding-bottom: 8px; margin-bottom: 10px;
  }
  .brand { display: flex; align-items: center; gap: 10px; }
  .brand img { height: 40px; width: auto; object-fit: contain; }
  .brand .name { font-size: 14px; font-weight: 700; color: #1E3A5F; line-height: 1.25; }
  .brand .sys { font-size: 9px; color: #6b7280; letter-spacing: .4px; }
  .titles { text-align: ${dir === 'rtl' ? 'left' : 'right'}; }
  .titles h1 { font-size: 15px; margin: 0; color: #111827; font-weight: 700; }
  .titles .sub { font-size: 10px; color: #6b7280; margin-top: 2px; }
  .info { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
  .info-item { border: 1px solid #e5e7eb; border-radius: 5px; padding: 3px 8px; background: #f9fafb; font-size: 9.5px; }
  .info-item .k { color: #6b7280; }
  .info-item .k::after { content: ':'; margin-inline-end: 4px; }
  .info-item .v { font-weight: 600; color: #111827; }
  table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; page-break-after: auto; }
  th {
    background: #1E3A5F; color: #fff; font-weight: 600; font-size: 10px;
    padding: 7px 6px; border: 1px solid #16304e; text-align: ${dir === 'rtl' ? 'right' : 'left'}; white-space: nowrap;
  }
  td { padding: 5px 6px; border: 1px solid #e5e7eb; text-align: ${dir === 'rtl' ? 'right' : 'left'}; vertical-align: top; }
  tbody tr:nth-child(even) td { background: #f7f9fc; }
  td.num, th.num { text-align: center; font-variant-numeric: tabular-nums; white-space: nowrap; }
  tfoot td { background: #eef2f7; font-weight: 700; border-top: 2px solid #1E3A5F; }
  .pill { display: inline-block; padding: 1px 7px; border-radius: 999px; border: 1px solid; font-size: 9px; font-weight: 600; white-space: nowrap; }
  h2.section { font-size: 12px; color: #1E3A5F; margin: 14px 0 6px; padding-bottom: 3px; border-bottom: 1px solid #e5e7eb; }
  .empty { color: #9ca3af; text-align: center; padding: 24px; font-style: italic; }
  footer.doc {
    position: fixed; bottom: 0; inset-inline: 0; height: 12mm;
    border-top: 1px solid #e5e7eb; padding-top: 4px;
    display: flex; align-items: center; justify-content: space-between;
    font-size: 8.5px; color: #6b7280;
  }
  .sig { margin-top: 28px; display: flex; gap: 60px; }
  .sig div { flex: 1; border-top: 1px solid #9ca3af; padding-top: 4px; font-size: 9px; color: #6b7280; text-align: center; }
  @media print { .no-print { display: none !important; } }
`;

/**
 * Opens a clean, print-ready document in a new tab and triggers the print dialog,
 * where the user picks "Save as PDF". Arabic shapes correctly because the browser
 * does the text layout with its own fonts.
 */
export function printDocument(meta: DocMeta, bodyHtml: string, opts?: { logoUrl?: string; signatures?: string[] }) {
  const dir = meta.dir || 'rtl';
  const lang = meta.lang || (dir === 'rtl' ? 'ar' : 'en');
  const company = meta.company || (lang === 'ar' ? 'شركة تجريبية للمقاولات' : 'Demo Contracting Co.');
  const generated = new Date().toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-GB');

  const w = window.open('', '_blank', 'width=1200,height=850');
  if (!w) { alert(lang === 'ar' ? 'المتصفح منع فتح نافذة الطباعة — اسمح بالنوافذ المنبثقة لهذا الموقع' : 'Pop-up blocked — allow pop-ups for this site'); return; }

  const sig = opts?.signatures?.length
    ? `<div class="sig">${opts.signatures.map(s => `<div>${esc(s)}</div>`).join('')}</div>` : '';

  w.document.write(`<!doctype html><html lang="${lang}" dir="${dir}"><head><meta charset="utf-8">
<title>${esc(meta.title)}</title>
<style>${PRINT_CSS(dir)}</style>
</head><body>
<div class="sheet">
  <header class="doc">
    <div class="brand">
      ${opts?.logoUrl ? `<img src="${esc(opts.logoUrl)}" alt="">` : ''}
      <div><div class="name">${esc(company)}</div><div class="sys">PIQCS — ${lang === 'ar' ? 'نظام إدارة ومتابعة الاستفسارات' : 'Inquiry & Quotation Control System'}</div></div>
    </div>
    <div class="titles">
      <h1>${esc(meta.title)}</h1>
      ${meta.subtitle ? `<div class="sub">${esc(meta.subtitle)}</div>` : ''}
    </div>
  </header>
  ${infoBlock([...(meta.info || []), { label: lang === 'ar' ? 'تاريخ الإصدار' : 'Generated', value: generated }])}
  ${bodyHtml}
  ${sig}
</div>
<footer class="doc">
  <span>${esc(COPYRIGHT)}</span>
  <span>PIQCS v1.3</span>
  <span>${esc(company)}</span>
</footer>
<script>window.onload=function(){setTimeout(function(){window.print();},350)}</script>
</body></html>`);
  w.document.close();

  logActivity({
    action: 'EXPORT', module: 'reports', recordLabel: meta.title,
    descriptionAr: `طباعة/PDF: ${meta.title}`, descriptionEn: `Print/PDF: ${meta.title}`
  });
}

/** kept so older call sites keep compiling */
export function printArea(title: string, html: string, dir: 'rtl' | 'ltr', _footer: string) {
  printDocument({ title, dir, lang: dir === 'rtl' ? 'ar' : 'en' }, html);
}
