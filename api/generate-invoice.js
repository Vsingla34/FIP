// /api/generate-invoice.js
// Generates a PDF tax invoice and returns it as base64
// Called by course/event confirmation emails
import PDFDocument from 'pdfkit';

export const config = { maxDuration: 30 };

function formatINR(n) {
  return '₹' + Number(n).toLocaleString('en-IN');
}

export function generateInvoicePDF({
  invoiceNo, invoiceDate, buyerName, buyerEmail,
  itemName, baseAmount, transactionId,
  gstNumber, gstCompanyName, gstAddress,
}) {
  return new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];

    doc.on('data',  c => chunks.push(c));
    doc.on('end',   () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const gstAmt   = Math.round(Number(baseAmount) * 0.18);
    const total    = Number(baseAmount) + gstAmt;
    const dateStr  = new Date(invoiceDate || Date.now())
      .toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });

    const BLUE   = '#1A3C6E';
    const ORANGE = '#F26522';
    const GREY   = '#6B7280';
    const LGREY  = '#F7F9FC';
    const W      = 595 - 100; // page width minus margins

    // ── Header bar ─────────────────────────────────────────
    doc.rect(50, 50, W, 70).fill(BLUE);
    doc.fillColor('#fff').font('Helvetica-Bold').fontSize(18)
       .text('Federation of Indian Professionals', 65, 65);
    doc.fillColor('rgba(255,255,255,0.6)').font('Helvetica').fontSize(9)
       .text('www.fipin.org  ·  New Delhi, India', 65, 87);

    // Invoice label + number (top right)
    doc.fillColor('#FFD09B').font('Helvetica-Bold').fontSize(9)
       .text('TAX INVOICE', 400, 65, { width: 145, align: 'right' });
    doc.fillColor('#fff').font('Helvetica-Bold').fontSize(13)
       .text(invoiceNo, 400, 78, { width: 145, align: 'right' });
    doc.fillColor('rgba(255,255,255,0.6)').font('Helvetica').fontSize(9)
       .text(dateStr, 400, 96, { width: 145, align: 'right' });

    // ── Parties ────────────────────────────────────────────
    doc.y = 140;
    doc.fillColor(GREY).font('Helvetica-Bold').fontSize(8)
       .text('FROM', 50, 140).text('BILL TO', 320, 140);

    doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(11)
       .text('Federation of Indian Professionals', 50, 153);
    doc.fillColor(GREY).font('Helvetica').fontSize(9)
       .text('New Delhi, India', 50, 167)
       .text('fippresidentoffice@gmail.com', 50, 178)
       .text('www.fipin.org', 50, 189);

    const billName = gstCompanyName || buyerName;
    doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(11)
       .text(billName, 320, 153, { width: 225 });
    doc.fillColor(GREY).font('Helvetica').fontSize(9);
    let billY = 167;
    doc.text(buyerEmail, 320, billY, { width: 225 }); billY += 12;
    if (gstAddress) { doc.text(gstAddress, 320, billY, { width: 225 }); billY += 24; }
    if (gstNumber)  { doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(9)
                        .text(`GSTIN: ${gstNumber}`, 320, billY); }

    // ── Divider ────────────────────────────────────────────
    doc.moveTo(50, 220).lineTo(545, 220).strokeColor('#E2E8F0').lineWidth(1).stroke();

    // ── Items table header ─────────────────────────────────
    doc.rect(50, 230, W, 24).fill(LGREY);
    doc.fillColor(GREY).font('Helvetica-Bold').fontSize(9)
       .text('DESCRIPTION', 62, 238)
       .text('HSN/SAC', 350, 238)
       .text('AMOUNT', 470, 238, { width: 75, align: 'right' });

    // ── Item row ───────────────────────────────────────────
    doc.rect(50, 254, W, 30).fill('#fff').stroke('#F3F4F6');
    doc.fillColor('#374151').font('Helvetica').fontSize(10)
       .text(itemName, 62, 262, { width: 280 });
    doc.fillColor(GREY).fontSize(9)
       .text('998596', 350, 264);
    doc.fillColor('#374151').fontSize(10)
       .text(formatINR(baseAmount), 470, 262, { width: 75, align: 'right' });

    // ── Totals ─────────────────────────────────────────────
    let ty = 294;
    const addTotal = (label, value, bold = false, color = GREY) => {
      doc.fillColor(color).font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 11 : 9)
         .text(label, 380, ty, { width: 90, align: 'right' })
         .text(formatINR(value), 470, ty, { width: 75, align: 'right' });
      ty += bold ? 20 : 16;
    };
    addTotal('Subtotal', baseAmount);
    addTotal('IGST @ 18%', gstAmt);
    doc.moveTo(380, ty - 4).lineTo(545, ty - 4).strokeColor('#E2E8F0').stroke();
    doc.rect(380, ty, 165, 26).fill(LGREY);
    doc.fillColor(ORANGE).font('Helvetica-Bold').fontSize(13)
       .text(formatINR(total), 470, ty + 6, { width: 75, align: 'right' });
    doc.fillColor(BLUE).fontSize(10)
       .text('Total', 380, ty + 8, { width: 90, align: 'right' });
    ty += 40;

    // ── Payment confirmation ────────────────────────────────
    doc.rect(50, ty, W, 36).fill('#F0FFF4');
    doc.fillColor('#15803D').font('Helvetica-Bold').fontSize(11)
       .text('✓  Payment Received', 65, ty + 11);
    if (transactionId) {
      doc.fillColor('#166534').font('Helvetica').fontSize(8)
         .text(`Transaction ID: ${transactionId}`, 300, ty + 13, { width: 240, align: 'right' });
    }
    ty += 50;

    // ── Footer ──────────────────────────────────────────────
    doc.moveTo(50, ty).lineTo(545, ty).strokeColor('#E2E8F0').stroke();
    doc.fillColor(GREY).font('Helvetica').fontSize(8)
       .text('This is a computer-generated invoice and does not require a physical signature.', 50, ty + 8, { align: 'center', width: W })
       .text('For queries: fippresidentoffice@gmail.com  ·  www.fipin.org', 50, ty + 20, { align: 'center', width: W });

    doc.end();
  });
}

// API handler — returns base64 PDF
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const pdfBuffer = await generateInvoicePDF(req.body);
    return res.status(200).json({ pdf: pdfBuffer.toString('base64') });
  } catch (e) {
    console.error('Invoice PDF error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}