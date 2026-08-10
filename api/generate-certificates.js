// /api/generate-certificates.js
// Uses pdfkit (pure JavaScript, no native binaries — works on Vercel)
import PDFDocument from 'pdfkit';
import nodemailer   from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import https from 'https';
import http  from 'http';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
}

function formatDate(d) {
  return new Date(d || Date.now()).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

/* Fetch a URL and return a Buffer (for custom template images) */
function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

/* ─────────────────────────────────────────────────────
   PDF CERTIFICATE GENERATOR
   All sizes are in PDF points (1 pt = 1/72 inch)
   A4 landscape = 841.89 × 595.28 pt
───────────────────────────────────────────────────── */

const W = 841.89;
const H = 595.28;

function buildPDF(style, recipientName, courseName, date, templateImageBuffer, certNo, signatureBuffer, layout, recipientEmail, background) {
  return new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ size: [W, H], margin: 0, info: { Title: 'Certificate of Completion' } });
    const chunks = [];
    doc.on('data',  c => chunks.push(c));
    doc.on('end',   ()  => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    if (style === 'custom-layout') {
      // Drag-and-drop designer output — background (image or solid design)
      // plus every element's position, all coming from the saved template.
      drawCustomLayout(doc, layout, background, templateImageBuffer, signatureBuffer, {
        name: recipientName, courseName, date, certNo, email: recipientEmail,
      });
      doc.end();
      return;
    }

    // ── Helper: add cert number + signature at bottom of any template ──
    const addFooterExtras = () => {
      // Certificate number
      if (certNo) {
        doc.fontSize(8).fillColor('#999').font('Helvetica')
           .text(`Cert No: ${certNo}`, 30, H - 22, { width: W - 60, align: 'left' });
      }
      // Signature image + line
      if (signatureBuffer) {
        const sigW = 110, sigH = 40;
        const sigX = W - sigW - 50;
        const sigY = H - sigH - 30;
        try {
          doc.image(signatureBuffer, sigX, sigY, { width: sigW, height: sigH });
        } catch (e) { /* skip if image fails */ }
        doc.moveTo(sigX - 10, H - 28).lineTo(sigX + sigW + 10, H - 28)
           .strokeColor('#666').lineWidth(0.7).stroke();
        doc.fontSize(8).fillColor('#888').font('Helvetica')
           .text('Authorised Signatory', sigX - 10, H - 24, { width: sigW + 20, align: 'center' });
      }
    };

    if (style === 'custom' && templateImageBuffer) {
      /* ── Custom template: image background + text overlay ── */
      doc.image(templateImageBuffer, 0, 0, { width: W, height: H });

      doc.fontSize(38).fillColor('#1A3C6E').font('Helvetica-Bold')
         .text(recipientName, 0, H * 0.50, { align: 'center', width: W });
      doc.fontSize(20).fillColor('#F26122').font('Helvetica')
         .text(courseName, 0, H * 0.61, { align: 'center', width: W });
      doc.fontSize(13).fillColor('#666').font('Helvetica')
         .text(date, 0, H * 0.73, { align: 'center', width: W });

    } else if (style === 'modern') {
      /* ── Modern Orange ── */
      doc.rect(0, 0, W, H).fill('#FFFFFF');

      // Orange top bar
      doc.rect(0, 0, W, 18).fill('#F26122');
      // Navy bottom bar
      doc.rect(0, H - 18, W, 18).fill('#1A3C6E');
      // Orange left stripe
      doc.rect(0, 18, 14, H - 36).fill('#F26122').fillOpacity(0.15);
      doc.fillOpacity(1);

      doc.fontSize(26).fillColor('#1A3C6E').font('Helvetica-Bold')
         .text('CERTIFICATE OF COMPLETION', 0, 70, { align: 'center', width: W });
      doc.fontSize(12).fillColor('#999').font('Helvetica')
         .text('Federation of Indian Professionals', 0, 108, { align: 'center', width: W });

      // Thin divider
      doc.moveTo(W*0.15, 135).lineTo(W*0.85, 135).strokeColor('#E0E0E0').lineWidth(1).stroke();

      doc.fontSize(40).fillColor('#F26122').font('Helvetica-Bold')
         .text(recipientName, 0, 158, { align: 'center', width: W });

      doc.fontSize(13).fillColor('#555').font('Helvetica')
         .text('has successfully completed', 0, 218, { align: 'center', width: W });

      doc.fontSize(22).fillColor('#1A3C6E').font('Helvetica-Bold')
         .text(courseName, 0, 250, { align: 'center', width: W });

      doc.fontSize(11).fillColor('#AAA').font('Helvetica')
         .text(date, 0, 310, { align: 'center', width: W });

    } else if (style === 'professional') {
      /* ── Dark Professional ── */
      doc.rect(0, 0, W, H).fill('#0F2044');

      // Gold outer border
      doc.rect(16, 16, W-32, H-32).strokeColor('#DAA520').lineWidth(2).stroke();
      // Gold inner border (thin)
      doc.rect(26, 26, W-52, H-52).strokeColor('#DAA520').lineWidth(0.6).fillOpacity(0).stroke();

      doc.fillOpacity(1).fontSize(26).fillColor('#DAA520').font('Helvetica-Bold')
         .text('CERTIFICATE OF EXCELLENCE', 0, 78, { align: 'center', width: W });

      // Gold rule
      doc.moveTo(W*0.22, 120).lineTo(W*0.78, 120).strokeColor('#DAA520').lineWidth(1).opacity(0.6).stroke();
      doc.opacity(1);

      doc.fontSize(13).fillColor('#C0C0C0').font('Helvetica')
         .text('Proudly Presented to', 0, 140, { align: 'center', width: W });

      doc.fontSize(40).fillColor('#FFFFFF').font('Helvetica-BoldOblique')
         .text(recipientName, 0, 176, { align: 'center', width: W });

      // Gold underline
      doc.moveTo(W*0.2, 238).lineTo(W*0.8, 238).strokeColor('#DAA520').lineWidth(1.2).opacity(0.7).stroke();
      doc.opacity(1);

      doc.fontSize(13).fillColor('#C0C0C0').font('Helvetica')
         .text('for successful completion of', 0, 256, { align: 'center', width: W });

      doc.fontSize(22).fillColor('#DAA520').font('Helvetica-Bold')
         .text(courseName, 0, 287, { align: 'center', width: W });

      doc.fontSize(11).fillColor('#888').font('Helvetica')
         .text(date, 0, 345, { align: 'center', width: W });

      doc.fontSize(10).fillColor('#DAA520').font('Helvetica').opacity(0.8)
         .text('Federation of Indian Professionals', 0, 380, { align: 'center', width: W });

    } else {
      /* ── Classic Blue (default) ── */
      doc.rect(0, 0, W, H).fill('#F8F6F0');

      // Navy outer border
      doc.rect(8, 8, W-16, H-16).strokeColor('#1A3C6E').lineWidth(10).stroke();
      // Gold inner border
      doc.rect(22, 22, W-44, H-44).strokeColor('#C9A84C').lineWidth(2).stroke();

      doc.fontSize(26).fillColor('#1A3C6E').font('Helvetica-Bold')
         .text('CERTIFICATE OF COMPLETION', 0, 76, { align: 'center', width: W });

      // Gold rule
      doc.moveTo(W*0.18, 120).lineTo(W*0.82, 120).strokeColor('#C9A84C').lineWidth(1.5).stroke();

      doc.fontSize(13).fillColor('#666').font('Helvetica')
         .text('This is to certify that', 0, 142, { align: 'center', width: W });

      doc.fontSize(40).fillColor('#C9A84C').font('Helvetica-BoldOblique')
         .text(recipientName, 0, 178, { align: 'center', width: W });

      // Navy underline
      doc.moveTo(W*0.2, 240).lineTo(W*0.8, 240).strokeColor('#1A3C6E').lineWidth(1.5).stroke();

      doc.fontSize(13).fillColor('#444').font('Helvetica')
         .text('has successfully completed', 0, 258, { align: 'center', width: W });

      doc.fontSize(22).fillColor('#1A3C6E').font('Helvetica-Bold')
         .text(courseName, 0, 289, { align: 'center', width: W });

      // Gold rule
      doc.moveTo(W*0.28, 330).lineTo(W*0.72, 330).strokeColor('#C9A84C').lineWidth(1).stroke();

      doc.fontSize(12).fillColor('#888').font('Helvetica')
         .text(date, 0, 346, { align: 'center', width: W });

      doc.fontSize(11).fillColor('#1A3C6E').font('Helvetica-Bold')
         .text('Federation of Indian Professionals', 0, 382, { align: 'center', width: W });
    }

    addFooterExtras();
    doc.end();
  });
}

/* ─────────────────────────────────────────────────────
   CUSTOM-LAYOUT RENDERER (drag-and-drop designer output)
   Every element's x/y/width are stored as PERCENT of the canvas the admin
   designed on — that's resolution-independent, so this is the only place
   percent gets converted to the PDF's point-based W×H. Font/size/color are
   applied literally; text elements wrap+align within their box.
───────────────────────────────────────────────────── */

const FONT_MAP = {
  'Helvetica-Bold': 'Helvetica-Bold', 'Helvetica': 'Helvetica',
  'Helvetica-Oblique': 'Helvetica-Oblique', 'Helvetica-BoldOblique': 'Helvetica-BoldOblique',
  'Times-Roman': 'Times-Roman', 'Times-Bold': 'Times-Bold',
  'Times-Italic': 'Times-Italic', 'Times-BoldItalic': 'Times-BoldItalic',
  'Courier': 'Courier', 'Courier-Bold': 'Courier-Bold',
};

function resolveKeyText(key, ctx) {
  switch (key) {
    case 'name':               return ctx.name;
    case 'course':              return ctx.courseName;
    case 'date':                 return ctx.date;
    case 'certificate_number':   return ctx.certNo;
    case 'organisation':         return 'Federation of Indian Professionals';
    case 'email':                return ctx.email || '';
    default:                     return '';
  }
}

function pickFont(el) {
  if (el.fontFamily && FONT_MAP[el.fontFamily]) return FONT_MAP[el.fontFamily];
  const base = el.italic ? 'Oblique' : '';
  return el.bold ? (el.italic ? 'Helvetica-BoldOblique' : 'Helvetica-Bold')
                 : (el.italic ? 'Helvetica-Oblique' : 'Helvetica');
}

function drawBackground(doc, background, templateImageBuffer) {
  if (background?.kind === 'image' || (!background && templateImageBuffer)) {
    if (templateImageBuffer) doc.image(templateImageBuffer, 0, 0, { width: W, height: H });
    return;
  }
  const bg = background || {};
  doc.rect(0, 0, W, H).fill(bg.bgColor || '#FFFFFF');
  if (bg.topBar)    doc.rect(0, 0, W, bg.topBar.height).fill(bg.topBar.color);
  if (bg.bottomBar) doc.rect(0, H - bg.bottomBar.height, W, bg.bottomBar.height).fill(bg.bottomBar.color);
  if (bg.outerBorder) {
    const w = bg.outerBorder.width || 4;
    doc.rect(w/2, w/2, W - w, H - w).strokeColor(bg.outerBorder.color).lineWidth(w).stroke();
  }
  if (bg.innerBorder) {
    const inset = bg.innerBorder.inset || 22, w = bg.innerBorder.width || 2;
    doc.rect(inset, inset, W - inset*2, H - inset*2).strokeColor(bg.innerBorder.color).lineWidth(w).stroke();
  }
}

function drawCustomLayout(doc, layout, background, templateImageBuffer, signatureBuffer, ctx) {
  drawBackground(doc, background, templateImageBuffer);

  for (const el of (layout || [])) {
    const xPt = ((el.xPct ?? 50) / 100) * W;
    const yPt = ((el.yPct ?? 50) / 100) * H;
    const wPt = ((el.widthPct ?? 40) / 100) * W;

    if (el.type === 'image' || el.key === 'signature') {
      if (!signatureBuffer) continue;
      const imgWPt = ((el.imgWidthPct ?? 14) / 100) * W;
      const imgHPt = ((el.imgHeightPct ?? 7) / 100) * H;
      try {
        doc.image(signatureBuffer, xPt - imgWPt / 2, yPt - imgHPt / 2, { width: imgWPt, height: imgHPt });
      } catch (e) { /* skip a bad signature image rather than fail the whole certificate */ }
      continue;
    }

    const text = el.key === 'custom' ? (el.text || '') : resolveKeyText(el.key, ctx);
    if (!text) continue;

    doc.fontSize(el.fontSize || 20)
       .fillColor(el.color || '#1A3C6E')
       .font(pickFont(el))
       .text(text, xPt - wPt / 2, yPt, { width: wPt, align: el.align || 'center' });
  }
}



export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const {
      courseId,
      recipients,
      templateUrl,           // legacy field, kept for old 'custom' style
      templateStyle = 'classic',
      layout,                // array of positioned elements, for templateStyle='custom-layout'
      background,            // {kind:'image',url} or {kind:'solid',...}, for templateStyle='custom-layout'
      signatureUrl,          // optional: URL of admin's signature image
      sendEmails    = true,
    } = req.body;

    if (!courseId)         return res.status(400).json({ error: 'courseId is required' });
    if (!recipients?.length) return res.status(400).json({ error: 'recipients list is empty' });
    if (templateStyle === 'custom' && !templateUrl)
      return res.status(400).json({ error: 'templateUrl required for a custom template' });
    if (templateStyle === 'custom-layout') {
      if (!Array.isArray(layout)) return res.status(400).json({ error: 'layout array required for templateStyle=custom-layout' });
      if (!background) return res.status(400).json({ error: 'background required for templateStyle=custom-layout' });
    }

    // Fetch course
    const { data: course, error: cErr } = await supabaseAdmin
      .from('courses').select('title,event_date').eq('id', courseId).single();
    if (cErr || !course) return res.status(404).json({ error: 'Course not found: ' + (cErr?.message||'') });

    // Pre-fetch custom template image once (legacy 'custom', or custom-layout with an image background)
    let templateImageBuffer = null;
    const imageSourceUrl = templateStyle === 'custom' ? templateUrl
      : (templateStyle === 'custom-layout' && background?.kind === 'image') ? background.url : null;
    if (imageSourceUrl) {
      try { templateImageBuffer = await fetchBuffer(imageSourceUrl); }
      catch (e) { return res.status(400).json({ error: 'Could not load template image: ' + e.message }); }
    }

    // Pre-fetch signature image once if provided
    let signatureBuffer = null;
    if (signatureUrl) {
      try { signatureBuffer = await fetchBuffer(signatureUrl); }
      catch (e) { console.warn('Could not load signature image:', e.message); }
    }

    const transporter   = sendEmails ? getTransporter() : null;
    const dateFormatted = formatDate(course.event_date);
    const results       = [];

    for (const rec of recipients) {
      const name  = (rec.name  || '').trim();
      const email = (rec.email || '').trim();
      if (!name || !email) continue;

      // Generate unique certificate number: FIP-YYYY-XXXXX
      const certNo = `FIP-${new Date().getFullYear()}-${String(Math.floor(10000 + Math.random() * 90000))}`;

      try {
        // Generate PDF certificate
        const pdfBuffer = await buildPDF(templateStyle, name, course.title, dateFormatted, templateImageBuffer, certNo, signatureBuffer, layout, email, background);

        // Upload PDF to Supabase Storage
        const fileName = `${courseId}/${Date.now()}_${name.replace(/[^a-z0-9]/gi,'_')}.pdf`;
        let certUrl = null;
        const { error: upErr } = await supabaseAdmin.storage
          .from('certificates').upload(fileName, pdfBuffer, { contentType: 'application/pdf', upsert: true });
        if (!upErr) {
          const { data: urlData } = supabaseAdmin.storage.from('certificates').getPublicUrl(fileName);
          certUrl = urlData?.publicUrl;
        }

        // Save to DB
        const { data: certRow } = await supabaseAdmin.from('certificates').insert({
          course_id:       courseId,
          recipient_name:  name,
          recipient_email: email,
          certificate_url: certUrl,
          template_url:    templateStyle === 'custom' ? templateUrl
                            : templateStyle === 'custom-layout' ? (background?.kind === 'image' ? background.url : 'custom-layout') : templateStyle,
          email_sent:      false,
        }).select().single();

        // Send email
        if (sendEmails && transporter && email) {
          const firstName = name.split(' ')[0];
          await transporter.sendMail({
            from:    `"FIP" <${process.env.GMAIL_USER}>`,
            to:      email,
            subject: `Your Certificate — ${course.title}`,
            html: `<div style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:24px">
              <div style="background:#1A3C6E;padding:20px 24px;border-radius:10px 10px 0 0;text-align:center">
                <h1 style="color:#fff;margin:0;font-size:22px">Congratulations, ${firstName}! 🎓</h1>
              </div>
              <div style="border:1px solid #E0E0E0;border-top:none;padding:24px;border-radius:0 0 10px 10px">
                <p style="font-size:15px;color:#333">Your certificate for <strong>${course.title}</strong> is attached to this email as a PDF.</p>
                ${certUrl ? `<p><a href="${certUrl}" style="display:inline-block;background:#F26122;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">⬇ Download Certificate</a></p>` : ''}
                <p style="color:#888;font-size:12px;margin-top:24px">Federation of Indian Professionals · <a href="https://www.fipin.org" style="color:#1A3C6E">www.fipin.org</a></p>
              </div>
            </div>`,
            attachments: [{ filename: `Certificate_${name.replace(/\s+/g,'_')}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }],
          });
          if (certRow?.id) {
            await supabaseAdmin.from('certificates')
              .update({ email_sent: true, email_sent_at: new Date().toISOString() }).eq('id', certRow.id);
          }
        }

        results.push({ name, email, success: true, certUrl });
      } catch (err) {
        console.error(`[cert] Failed for ${name}:`, err.message);
        results.push({ name, email, success: false, error: err.message });
      }
    }

    return res.status(200).json({
      generated: results.filter(r => r.success).length,
      failed:    results.filter(r => !r.success).length,
      total:     results.length,
      results,
    });

  } catch (err) {
    console.error('[generate-certificates] Fatal:', err);
    return res.status(500).json({ error: err.message });
  }
}