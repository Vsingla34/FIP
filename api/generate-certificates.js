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

function buildPDF(style, recipientName, courseName, date, templateImageBuffer) {
  return new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ size: [W, H], margin: 0, info: { Title: 'Certificate of Completion' } });
    const chunks = [];
    doc.on('data',  c => chunks.push(c));
    doc.on('end',   ()  => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

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

    doc.end();
  });
}

/* ─────────────────────────────────────────────────────
   HANDLER
───────────────────────────────────────────────────── */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const {
      courseId,
      recipients,
      templateUrl,
      templateStyle = 'classic',
      sendEmails    = true,
    } = req.body;

    if (!courseId)         return res.status(400).json({ error: 'courseId is required' });
    if (!recipients?.length) return res.status(400).json({ error: 'recipients list is empty' });
    if (templateStyle === 'custom' && !templateUrl)
      return res.status(400).json({ error: 'templateUrl required for custom template' });

    // Fetch course
    const { data: course, error: cErr } = await supabaseAdmin
      .from('courses').select('title,event_date').eq('id', courseId).single();
    if (cErr || !course) return res.status(404).json({ error: 'Course not found: ' + (cErr?.message||'') });

    // Pre-fetch custom template image once (if custom)
    let templateImageBuffer = null;
    if (templateStyle === 'custom' && templateUrl) {
      try { templateImageBuffer = await fetchBuffer(templateUrl); }
      catch (e) { return res.status(400).json({ error: 'Could not load template image: ' + e.message }); }
    }

    const transporter   = sendEmails ? getTransporter() : null;
    const dateFormatted = formatDate(course.event_date);
    const results       = [];

    for (const rec of recipients) {
      const name  = (rec.name  || '').trim();
      const email = (rec.email || '').trim();
      if (!name || !email) continue;

      try {
        // Generate PDF certificate
        const pdfBuffer = await buildPDF(templateStyle, name, course.title, dateFormatted, templateImageBuffer);

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
          template_url:    templateStyle === 'custom' ? templateUrl : templateStyle,
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