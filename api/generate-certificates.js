// /api/generate-certificates.js
import { createCanvas, loadImage } from 'canvas';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

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

/* ─────────────────────────────────────────────────────
   BUILT-IN CERTIFICATE STYLES (no image needed)
───────────────────────────────────────────────────── */

function drawClassic(ctx, W, H, recipientName, courseName, date) {
  // Cream background
  ctx.fillStyle = '#F8F6F0';
  ctx.fillRect(0, 0, W, H);

  // Outer navy border
  ctx.strokeStyle = '#1A3C6E';
  ctx.lineWidth = Math.round(W * 0.012);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, W - ctx.lineWidth, H - ctx.lineWidth);

  // Inner gold border
  const pad = Math.round(W * 0.028);
  ctx.strokeStyle = '#C9A84C';
  ctx.lineWidth = Math.round(W * 0.003);
  ctx.strokeRect(pad, pad, W - pad * 2, H - pad * 2);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Heading
  ctx.fillStyle = '#1A3C6E';
  ctx.font = `bold ${Math.round(W * 0.038)}px Georgia, serif`;
  ctx.fillText('CERTIFICATE OF COMPLETION', W / 2, H * 0.17);

  // Gold rule
  ctx.strokeStyle = '#C9A84C';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(W * 0.18, H * 0.25); ctx.lineTo(W * 0.82, H * 0.25); ctx.stroke();

  // Sub-label
  ctx.fillStyle = '#666';
  ctx.font = `${Math.round(W * 0.021)}px Arial, sans-serif`;
  ctx.fillText('This is to certify that', W / 2, H * 0.35);

  // Recipient name
  ctx.fillStyle = '#C9A84C';
  ctx.font = `bold italic ${Math.round(W * 0.053)}px Georgia, serif`;
  ctx.fillText(recipientName, W / 2, H * 0.50);

  // Name underline
  const nw = ctx.measureText(recipientName).width;
  ctx.strokeStyle = '#1A3C6E';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(W / 2 - nw / 2 - 20, H * 0.565);
  ctx.lineTo(W / 2 + nw / 2 + 20, H * 0.565);
  ctx.stroke();

  // "has successfully completed"
  ctx.fillStyle = '#444';
  ctx.font = `${Math.round(W * 0.021)}px Arial, sans-serif`;
  ctx.fillText('has successfully completed', W / 2, H * 0.625);

  // Course title
  ctx.fillStyle = '#1A3C6E';
  ctx.font = `bold ${Math.round(W * 0.031)}px Georgia, serif`;
  ctx.fillText(courseName, W / 2, H * 0.705);

  // Gold rule
  ctx.strokeStyle = '#C9A84C';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(W * 0.25, H * 0.76); ctx.lineTo(W * 0.75, H * 0.76); ctx.stroke();

  // Date
  ctx.fillStyle = '#888';
  ctx.font = `${Math.round(W * 0.018)}px Arial, sans-serif`;
  ctx.fillText(date, W / 2, H * 0.82);

  // FIP footer
  ctx.fillStyle = '#1A3C6E';
  ctx.font = `bold ${Math.round(W * 0.019)}px Arial, sans-serif`;
  ctx.fillText('Federation of Indian Professionals', W / 2, H * 0.905);
}

function drawModern(ctx, W, H, recipientName, courseName, date) {
  // White background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);

  // Orange top bar
  ctx.fillStyle = '#F26122';
  ctx.fillRect(0, 0, W, Math.round(H * 0.055));

  // Navy bottom bar
  ctx.fillStyle = '#1A3C6E';
  ctx.fillRect(0, H - Math.round(H * 0.055), W, Math.round(H * 0.055));

  // Orange left accent stripe
  ctx.fillStyle = '#F26122';
  ctx.globalAlpha = 0.15;
  ctx.fillRect(0, Math.round(H * 0.055), Math.round(W * 0.022), H - Math.round(H * 0.11));
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Heading
  ctx.fillStyle = '#1A3C6E';
  ctx.font = `bold ${Math.round(W * 0.036)}px Arial, sans-serif`;
  ctx.fillText('CERTIFICATE OF COMPLETION', W / 2, H * 0.19);

  // FIP subtitle
  ctx.fillStyle = '#999';
  ctx.font = `${Math.round(W * 0.019)}px Arial, sans-serif`;
  ctx.fillText('Federation of Indian Professionals', W / 2, H * 0.28);

  // Thin divider
  ctx.strokeStyle = '#E0E0E0';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(W * 0.15, H * 0.34); ctx.lineTo(W * 0.85, H * 0.34); ctx.stroke();

  // Recipient name
  ctx.fillStyle = '#F26122';
  ctx.font = `bold ${Math.round(W * 0.052)}px Arial, sans-serif`;
  ctx.fillText(recipientName, W / 2, H * 0.50);

  // "has successfully completed"
  ctx.fillStyle = '#555';
  ctx.font = `${Math.round(W * 0.021)}px Arial, sans-serif`;
  ctx.fillText('has successfully completed', W / 2, H * 0.60);

  // Course title
  ctx.fillStyle = '#1A3C6E';
  ctx.font = `bold ${Math.round(W * 0.03)}px Arial, sans-serif`;
  ctx.fillText(courseName, W / 2, H * 0.695);

  // Date
  ctx.fillStyle = '#AAA';
  ctx.font = `${Math.round(W * 0.018)}px Arial, sans-serif`;
  ctx.fillText(date, W / 2, H * 0.82);
}

function drawProfessional(ctx, W, H, recipientName, courseName, date) {
  // Dark navy background
  ctx.fillStyle = '#0F2044';
  ctx.fillRect(0, 0, W, H);

  // Outer gold border
  const b1 = Math.round(W * 0.022);
  ctx.strokeStyle = '#DAA520';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(b1, b1, W - b1 * 2, H - b1 * 2);

  // Inner gold border (thinner)
  const b2 = Math.round(W * 0.034);
  ctx.strokeStyle = '#DAA520';
  ctx.lineWidth = 0.8;
  ctx.globalAlpha = 0.5;
  ctx.strokeRect(b2, b2, W - b2 * 2, H - b2 * 2);
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Heading
  ctx.fillStyle = '#DAA520';
  ctx.font = `bold ${Math.round(W * 0.037)}px Georgia, serif`;
  ctx.fillText('CERTIFICATE OF EXCELLENCE', W / 2, H * 0.18);

  // Gold rule
  ctx.strokeStyle = '#DAA520';
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.6;
  ctx.beginPath(); ctx.moveTo(W * 0.2, H * 0.26); ctx.lineTo(W * 0.8, H * 0.26); ctx.stroke();
  ctx.globalAlpha = 1;

  // "Proudly Presented to"
  ctx.fillStyle = '#C0C0C0';
  ctx.font = `${Math.round(W * 0.021)}px Arial, sans-serif`;
  ctx.fillText('Proudly Presented to', W / 2, H * 0.36);

  // Recipient name
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold italic ${Math.round(W * 0.052)}px Georgia, serif`;
  ctx.fillText(recipientName, W / 2, H * 0.50);

  // Gold name underline
  const nw = ctx.measureText(recipientName).width;
  ctx.strokeStyle = '#DAA520';
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.moveTo(W / 2 - nw / 2 - 10, H * 0.565);
  ctx.lineTo(W / 2 + nw / 2 + 10, H * 0.565);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // "for successful completion of"
  ctx.fillStyle = '#C0C0C0';
  ctx.font = `${Math.round(W * 0.021)}px Arial, sans-serif`;
  ctx.fillText('for successful completion of', W / 2, H * 0.635);

  // Course title
  ctx.fillStyle = '#DAA520';
  ctx.font = `bold ${Math.round(W * 0.031)}px Georgia, serif`;
  ctx.fillText(courseName, W / 2, H * 0.715);

  // Date
  ctx.fillStyle = '#888';
  ctx.font = `${Math.round(W * 0.018)}px Arial, sans-serif`;
  ctx.fillText(date, W / 2, H * 0.825);

  // FIP footer
  ctx.fillStyle = '#DAA520';
  ctx.globalAlpha = 0.8;
  ctx.font = `${Math.round(W * 0.017)}px Arial, sans-serif`;
  ctx.fillText('Federation of Indian Professionals', W / 2, H * 0.905);
  ctx.globalAlpha = 1;
}

/* ─────────────────────────────────────────────────────
   MAIN GENERATOR  
───────────────────────────────────────────────────── */

async function generateCertificate({ templateUrl, templateStyle, recipientName, courseName, date }) {
  let canvas, ctx;

  if (templateStyle && templateStyle !== 'custom') {
    // Built-in style — draw from scratch at 1200×850
    const W = 1200, H = 850;
    canvas = createCanvas(W, H);
    ctx    = canvas.getContext('2d');
    const d = formatDate(date);
    if (templateStyle === 'classic')      drawClassic(ctx, W, H, recipientName, courseName, d);
    else if (templateStyle === 'modern')  drawModern(ctx, W, H, recipientName, courseName, d);
    else                                  drawProfessional(ctx, W, H, recipientName, courseName, d);
  } else {
    // Custom uploaded template image
    const templateImg = await loadImage(templateUrl);
    canvas = createCanvas(templateImg.width, templateImg.height);
    ctx    = canvas.getContext('2d');
    ctx.drawImage(templateImg, 0, 0);
    const W = canvas.width, H = canvas.height;
    const d = formatDate(date);

    // Name — navy, centered
    ctx.fillStyle = '#1A3C6E'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.round(W * 0.044)}px Georgia, serif`;
    ctx.fillText(recipientName, W / 2, H * 0.52);

    // Course
    ctx.fillStyle = '#F26122';
    ctx.font = `${Math.round(W * 0.024)}px Georgia, serif`;
    ctx.fillText(courseName, W / 2, H * 0.61);

    // Date
    ctx.fillStyle = '#666';
    ctx.font = `${Math.round(W * 0.017)}px Arial, sans-serif`;
    ctx.fillText(d, W / 2, H * 0.73);
  }

  return canvas.toBuffer('image/png');
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
      recipients,      // [{name, email}]  — uploaded from Excel
      templateUrl,     // custom image URL  — used when templateStyle === 'custom'
      templateStyle,   // 'classic' | 'modern' | 'professional' | 'custom'
      sendEmails = true,
    } = req.body;

    if (!courseId) return res.status(400).json({ error: 'courseId is required' });
    if (!recipients?.length) return res.status(400).json({ error: 'recipients list is empty' });
    if (templateStyle === 'custom' && !templateUrl)
      return res.status(400).json({ error: 'templateUrl required when templateStyle is custom' });

    // Fetch course for title + date
    const { data: course } = await supabaseAdmin
      .from('courses').select('title,event_date').eq('id', courseId).single();
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const transporter = sendEmails ? getTransporter() : null;
    const results     = [];
    const usedTemplate = templateStyle === 'custom' ? templateUrl : templateStyle;

    for (const rec of recipients) {
      const name  = (rec.name  || '').trim();
      const email = (rec.email || '').trim();
      if (!name || !email) continue;

      try {
        const certBuffer = await generateCertificate({
          templateUrl:   templateStyle === 'custom' ? templateUrl : null,
          templateStyle: templateStyle !== 'custom' ? templateStyle : null,
          recipientName: name,
          courseName:    course.title,
          date:          course.event_date,
        });

        // Upload to Supabase Storage
        const fileName = courseId + '/' + Date.now() + '_' + name.replace(/[^a-z0-9]/gi, '_') + '.png';
        let certUrl = null;
        const { error: upErr } = await supabaseAdmin.storage
          .from('certificates').upload(fileName, certBuffer, { contentType: 'image/png', upsert: true });
        if (!upErr) {
          const { data: urlData } = supabaseAdmin.storage.from('certificates').getPublicUrl(fileName);
          certUrl = urlData?.publicUrl;
        }

        // Save to certificates table
        const { data: certRow } = await supabaseAdmin.from('certificates').insert({
          course_id:       courseId,
          recipient_name:  name,
          recipient_email: email,
          certificate_url: certUrl,
          template_url:    usedTemplate,
          email_sent:      false,
        }).select().single();

        // Send email
        if (sendEmails && transporter && email) {
          const firstName = name.split(' ')[0];
          await transporter.sendMail({
            from:    '"FIP" <' + process.env.GMAIL_USER + '>',
            to:      email,
            subject: 'Your Certificate — ' + course.title,
            html: `<div style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:24px">
              <div style="background:#1A3C6E;padding:20px 24px;border-radius:10px 10px 0 0;text-align:center">
                <h1 style="color:#fff;margin:0;font-size:22px">Congratulations, ${firstName}! 🎓</h1>
              </div>
              <div style="border:1px solid #E0E0E0;border-top:none;padding:24px;border-radius:0 0 10px 10px">
                <p style="font-size:15px;color:#333">Your certificate for <strong>${course.title}</strong> is ready.</p>
                ${certUrl
                  ? `<p><a href="${certUrl}" style="display:inline-block;background:#F26122;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">⬇ Download Certificate</a></p>`
                  : ''
                }
                <p style="color:#888;font-size:12px;margin-top:24px">
                  Federation of Indian Professionals · <a href="https://www.fipin.org" style="color:#1A3C6E">www.fipin.org</a>
                </p>
              </div>
            </div>`,
            attachments: certUrl ? [] : [{ filename: 'Certificate.png', content: certBuffer, contentType: 'image/png' }],
          });
          if (certRow?.id) {
            await supabaseAdmin.from('certificates')
              .update({ email_sent: true, email_sent_at: new Date().toISOString() }).eq('id', certRow.id);
          }
        }

        results.push({ name, email, success: true, certUrl });
      } catch (err) {
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
    console.error('[generate-certificates] Fatal error:', err);
    return res.status(500).json({ error: err.message, stack: err.stack?.split('\n').slice(0,4).join(' | ') });
  }
}