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
  return new Date(d || Date.now()).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });
}

async function generateCertificate({ templateUrl, recipientName, courseName, date }) {
  const templateImg = await loadImage(templateUrl);
  const canvas = createCanvas(templateImg.width, templateImg.height);
  const ctx    = canvas.getContext('2d');
  ctx.drawImage(templateImg, 0, 0);
  const W = canvas.width;
  const H = canvas.height;

  // Name — large gold, centered
  ctx.fillStyle = '#1A3C6E';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.round(W * 0.044)}px Georgia, serif`;
  ctx.fillText(recipientName, W / 2, H * 0.52);

  // Course name
  ctx.fillStyle = '#F26122';
  ctx.font = `${Math.round(W * 0.024)}px Georgia, serif`;
  ctx.fillText(courseName, W / 2, H * 0.61);

  // Date
  ctx.fillStyle = '#666';
  ctx.font = `${Math.round(W * 0.017)}px Arial, sans-serif`;
  ctx.fillText(formatDate(date), W / 2, H * 0.73);

  return canvas.toBuffer('image/png');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { courseId, templateUrl, sendEmails = true } = req.body;
    if (!courseId || !templateUrl) return res.status(400).json({ error: 'courseId and templateUrl required' });

    const { data: course } = await supabaseAdmin
      .from('courses').select('title,event_date').eq('id', courseId).single();
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const { data: registrations } = await supabaseAdmin
      .from('course_registrations')
      .select('id,full_name,email,user_id')
      .eq('course_id', courseId);

    if (!registrations?.length) return res.status(200).json({ generated: 0, message: 'No registrations' });

    const transporter = sendEmails ? getTransporter() : null;
    const results = [];

    for (const reg of registrations) {
      try {
        const certBuffer = await generateCertificate({
          templateUrl,
          recipientName: reg.full_name,
          courseName:    course.title,
          date:          course.event_date,
        });

        // Upload to Supabase Storage
        const fileName = courseId + '/' + reg.id + '_' + Date.now() + '.png';
        let certUrl = null;
        const { error: upErr } = await supabaseAdmin.storage
          .from('certificates').upload(fileName, certBuffer, { contentType:'image/png', upsert:true });
        if (!upErr) {
          const { data: urlData } = supabaseAdmin.storage.from('certificates').getPublicUrl(fileName);
          certUrl = urlData?.publicUrl;
        }

        // Save to DB
        const { data: certRow } = await supabaseAdmin.from('certificates').insert({
          course_id: courseId, user_id: reg.user_id, registration_id: reg.id,
          recipient_name: reg.full_name, recipient_email: reg.email,
          certificate_url: certUrl, template_url: templateUrl, email_sent: false,
        }).select().single();

        // Send email
        if (sendEmails && transporter && reg.email) {
          const firstName = reg.full_name.split(' ')[0];
          await transporter.sendMail({
            from: '"FIP" <' + process.env.GMAIL_USER + '>',
            to:   reg.email,
            subject: 'Your Certificate — ' + course.title,
            html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
              <h2 style="color:#1A3C6E">Congratulations, ${firstName}! 🎓</h2>
              <p>Your certificate for <strong>${course.title}</strong> is ready.</p>
              ${certUrl ? '<p><a href="' + certUrl + '" style="background:#F26122;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">Download Your Certificate</a></p>' : ''}
              <p style="color:#666;font-size:12px">Federation of Indian Professionals · www.fipin.org</p>
            </div>`,
            attachments: certUrl ? [] : [{ filename: 'Certificate.png', content: certBuffer, contentType: 'image/png' }],
          });
          if (certRow) await supabaseAdmin.from('certificates')
            .update({ email_sent: true, email_sent_at: new Date().toISOString() }).eq('id', certRow.id);
        }

        results.push({ name: reg.full_name, email: reg.email, success: true, certUrl });
      } catch (err) {
        results.push({ name: reg.full_name, email: reg.email, success: false, error: err.message });
      }
    }

    return res.status(200).json({
      generated: results.filter(r => r.success).length,
      failed:    results.filter(r => !r.success).length,
      total:     results.length, results,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}