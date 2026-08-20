function generateInvoice({ invoiceNo, invoiceDate, buyerName, buyerEmail, itemName, baseAmount, gstNumber, gstCompanyName, gstAddress, transactionId }) {
  const gstAmt  = Math.round(baseAmount * 0.18);
  const total   = baseAmount + gstAmt;
  const fmtDate = new Date(invoiceDate||Date.now()).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'});
  const fmt     = n => Number(n).toLocaleString('en-IN');
  return `
  <div style="margin:24px 0;border:1px solid #E2E8F0;border-radius:10px;overflow:hidden">
    <div style="background:#1A3C6E;padding:14px 22px;display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-size:11px;color:#FFD09B;letter-spacing:1px;text-transform:uppercase;font-weight:700">Tax Invoice</div>
        <div style="font-size:17px;font-weight:900;color:#fff">Federation of Indian Professionals</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:11px;color:rgba(255,255,255,0.5)">Invoice No.</div>
        <div style="font-size:13px;font-weight:700;color:#FFD09B;font-family:monospace">${invoiceNo}</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:4px">${fmtDate}</div>
      </div>
    </div>
    <div style="padding:18px 22px;background:#fff">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid #F3F4F6">
        <div>
          <div style="font-size:10px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:1px;margin-bottom:5px">From</div>
          <div style="font-size:13px;font-weight:700;color:#1A3C6E">Federation of Indian Professionals</div>
          <div style="font-size:12px;color:#6B7280;line-height:1.6">New Delhi, India<br/>www.fipin.org</div>
        </div>
        <div>
          <div style="font-size:10px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:1px;margin-bottom:5px">Bill To</div>
          <div style="font-size:13px;font-weight:700;color:#1A3C6E">${gstCompanyName || buyerName}</div>
          <div style="font-size:12px;color:#6B7280;line-height:1.6">${buyerEmail}${gstAddress ? '<br/>' + gstAddress : ''}${gstNumber ? '<br/>GSTIN: <strong>' + gstNumber + '</strong>' : ''}</div>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:14px">
        <tr style="background:#F7F9FC"><th style="text-align:left;padding:8px 12px;font-size:11px;color:#6B7280;font-weight:700">Description</th><th style="text-align:right;padding:8px 12px;font-size:11px;color:#6B7280;font-weight:700">Amount</th></tr>
        <tr style="border-bottom:1px solid #F3F4F6"><td style="padding:10px 12px;font-size:13px">${itemName}</td><td style="padding:10px 12px;font-size:13px;text-align:right">₹${fmt(baseAmount)}</td></tr>
        <tr><td style="padding:6px 12px;font-size:12px;color:#6B7280;text-align:right">IGST @ 18%</td><td style="padding:6px 12px;font-size:12px;color:#6B7280;text-align:right">₹${fmt(gstAmt)}</td></tr>
        <tr style="background:#F7F9FC"><td style="padding:10px 12px;font-size:14px;font-weight:800;color:#1A3C6E;text-align:right">Total</td><td style="padding:10px 12px;font-size:16px;font-weight:900;color:#F26522;text-align:right">₹${fmt(total)}</td></tr>
      </table>
      <div style="background:#F0FFF4;border:1px solid #86EFAC;border-radius:8px;padding:10px 16px;display:flex;justify-content:space-between">
        <div style="font-size:13px;font-weight:700;color:#15803D">✅ Payment Received</div>
        ${transactionId ? `<div style="font-size:11px;color:#166534;font-family:monospace">Txn: ${transactionId}</div>` : ''}
      </div>
      <p style="font-size:11px;color:#9CA3AF;text-align:center;margin:12px 0 0">Computer-generated invoice. No signature required.</p>
    </div>
  </div>`;
}

// /api/send-course-confirmation.js
import nodemailer from 'nodemailer';

function formatDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).end();

  const { name, email, courseTitle, eventDate, eventTime, zoomLink, zoomPassword, whatsappGroupLink, customSubject, customBody, transactionId } = req.body;
  if (!email || !courseTitle) return res.status(400).json({ error: 'Missing fields' });

  // Generated ONCE and reused for both the inline HTML invoice and the PDF
  // attachment below — same fix as send-event-confirmation.js. Each used to
  // call Date.now() independently at a different line, producing two
  // different numbers for the same transaction.
  const invoiceNo = 'FIP-INV-' + new Date().getFullYear() + '-' +
    (transactionId ? transactionId.replace(/[^0-9]/g, '').slice(-5) || Date.now().toString().slice(-5)
                    : Date.now().toString().slice(-5));

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return res.status(200).json({ sent: false, reason: 'Email not configured' });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });

  const firstName = name?.split(' ')[0] || 'there';
  const formattedDate = formatDate(eventDate);

  // Per-course custom message, if the admin set one — {{name}}/{{title}}/
  // {{date}}/{{time}} substituted. Falls back to the standard line below.
  const fillVars = (s) => (s || '')
    .replaceAll('{{name}}',  firstName)
    .replaceAll('{{title}}', courseTitle || '')
    .replaceAll('{{date}}',  formattedDate || '')
    .replaceAll('{{time}}',  eventTime || '');
  const introHtml = customBody
    ? fillVars(customBody).split('\n').filter(Boolean).map(line =>
        `<p style="font-size:14px;color:#4B5563;line-height:1.8;margin:0 0 12px;">${line}</p>`).join('')
    : `<p style="font-size:14px;color:#4B5563;line-height:1.8;margin:0 0 24px;">
      Thank you for registering! We're excited to have you join us for this live session.
      Here are all the details you need:
    </p>`;
  const emailSubject = customSubject
    ? fillVars(customSubject)
    : `Registered: ${courseTitle} — Your Zoom Link Inside`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F0F4FA;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:600px;margin:32px auto;">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#1A3C6E 0%,#1B4A9E 100%);border-radius:16px 16px 0 0;padding:40px;text-align:center;position:relative;overflow:hidden;">
    <div style="position:absolute;top:-30px;right:-30px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,0.06);"></div>
    <div style="font-size:32px;font-weight:900;color:#fff;letter-spacing:3px;margin-bottom:2px;">FIP</div>
    <div style="font-size:11px;color:rgba(255,255,255,0.45);letter-spacing:2px;text-transform:uppercase;">Federation of Indian Professionals</div>
    <div style="margin-top:20px;font-size:40px;"></div>
    <h1 style="font-size:24px;font-weight:800;color:#fff;margin:10px 0 4px;">You're In, ${firstName}!</h1>
    <p style="font-size:14px;color:rgba(255,255,255,0.65);margin:0;">Your registration is confirmed.</p>
  </div>

  <!-- Blue strip -->
  <div style="background:#2D8CFF;padding:14px 32px;text-align:center;">
    <div style="font-size:11px;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:2px;margin-bottom:3px;">Registered For</div>
    <div style="font-size:17px;font-weight:800;color:#fff;">${courseTitle}</div>
  </div>

  <!-- Body -->
  <div style="background:#fff;padding:36px 40px;">
    <p style="font-size:15px;color:#1A3C6E;font-weight:700;margin:0 0 8px;">Dear ${name},</p>
    ${introHtml}

    <!-- Event details card -->
    <div style="background:#F8FAFF;border:2px solid #BFDBFE;border-radius:14px;padding:24px;margin:0 0 24px;">
      <div style="font-size:12px;font-weight:700;color:#1E40AF;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:16px;"> Session Details</div>
      
      ${formattedDate ? `
      <div style="display:flex;gap:14px;align-items:center;padding:10px 0;border-bottom:1px solid #DBEAFE;">
        <div style="width:32px;height:32px;border-radius:8px;background:#EFF6FF;display:flex;align-items:center;justify-content:center;flex-shrink:0;"></div>
        <div>
          <div style="font-size:11px;color:#93C5FD;text-transform:uppercase;letter-spacing:0.5px;">Date</div>
          <div style="font-size:14px;font-weight:700;color:#1E3A5F;">${formattedDate}</div>
        </div>
      </div>` : ''}
      
      ${eventTime ? `
      <div style="display:flex;gap:14px;align-items:center;padding:10px 0;border-bottom:1px solid #DBEAFE;">
        <div style="width:32px;height:32px;border-radius:8px;background:#EFF6FF;display:flex;align-items:center;justify-content:center;flex-shrink:0;"></div>
        <div>
          <div style="font-size:11px;color:#93C5FD;text-transform:uppercase;letter-spacing:0.5px;">Time</div>
          <div style="font-size:14px;font-weight:700;color:#1E3A5F;">${eventTime}</div>
        </div>
      </div>` : ''}

      <div style="display:flex;gap:14px;align-items:center;padding:10px 0;">
        <div style="width:32px;height:32px;border-radius:8px;background:#EFF6FF;display:flex;align-items:center;justify-content:center;flex-shrink:0;"></div>
        <div>
          <div style="font-size:11px;color:#93C5FD;text-transform:uppercase;letter-spacing:0.5px;">Platform</div>
          <div style="font-size:14px;font-weight:700;color:#2D8CFF;">Live on Zoom</div>
        </div>
      </div>
    </div>

    <!-- Zoom link box -->
    ${zoomLink ? `
    <div style="background:linear-gradient(135deg,#EFF6FF,#DBEAFE);border:2px solid #2D8CFF;border-radius:14px;padding:22px;margin:0 0 24px;text-align:center;">
      <div style="font-size:28px;margin-bottom:10px;"></div>
      <div style="font-size:12px;font-weight:700;color:#1E40AF;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Your Zoom Meeting Link</div>
      <a href="${zoomLink}" style="display:inline-block;background:#2D8CFF;color:#fff;text-decoration:none;padding:13px 28px;border-radius:8px;font-weight:800;font-size:14px;margin-bottom:${zoomPassword?'12px':'0'};">
        Join Zoom Meeting →
      </a>
      ${zoomPassword ? `<div style="font-size:12px;color:#1E40AF;margin-top:8px;background:#fff;padding:6px 14px;border-radius:6px;display:inline-block;"><strong>Password:</strong> ${zoomPassword}</div>` : ''}
    </div>
    ` : `
    <div style="background:#FEF3C7;border:1px solid #FCD34D;border-radius:10px;padding:16px 20px;margin:0 0 24px;font-size:13px;color:#92400E;">
      <strong> Zoom link coming soon!</strong> We'll send you the meeting link closer to the session date.
    </div>`}

    <!-- WhatsApp Group link box -->
    ${whatsappGroupLink ? `
    <div style="background:linear-gradient(135deg,#E7FBF0,#D1FAE5);border:2px solid #25D366;border-radius:14px;padding:22px;margin:0 0 24px;text-align:center;">
      <div style="font-size:28px;margin-bottom:10px;">💬</div>
      <div style="font-size:12px;font-weight:700;color:#15803D;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Join WhatsApp Group</div>
      <p style="font-size:13px;color:#166534;margin:0 0 12px;">Get updates, resources and connect with fellow participants!</p>
      <a href="${whatsappGroupLink}" style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:800;font-size:14px;">
        Join WhatsApp Group →
      </a>
    </div>
    ` : ''}

    <!-- Tax Invoice (shown when payment made) -->
    ${baseAmount ? generateInvoice({
      invoiceNo,
      invoiceDate:    new Date(),
      buyerName:      name,
      buyerEmail:     email,
      itemName:       courseTitle,
      baseAmount:     Number(baseAmount),
      gstNumber,
      gstCompanyName,
      gstAddress,
      transactionId,
    }) : ''}

    <!-- Tips -->
    <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:18px 20px;margin:0 0 24px;">
      <div style="font-size:12px;font-weight:700;color:#15803D;margin-bottom:10px;"> Tips to Get Ready</div>
      <ul style="margin:0;padding-left:18px;font-size:13px;color:#166534;line-height:2;">
        <li>Download and install <strong>Zoom</strong> before the session</li>
        <li>Join 5 minutes early to test your audio/video</li>
        <li>Keep this email handy — your meeting link is above</li>
        <li>Questions? Email us at fippresidentoffice@gmail.com</li>
      </ul>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin:28px 0 8px;">
      <a href="https://www.fipin.org/courses" style="display:inline-block;background:linear-gradient(135deg,#F26122,#E05010);color:#fff;text-decoration:none;padding:13px 32px;border-radius:10px;font-weight:800;font-size:14px;">
        Explore More Courses →
      </a>
    </div>
  </div>

  <!-- Footer -->
  <div style="background:#1A3C6E;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;">
    <div style="font-size:14px;font-weight:700;color:#FFD09B;margin-bottom:6px;">Connect · Collaborate · Conquer</div>
    <div style="font-size:12px;color:rgba(255,255,255,0.45);">© 2026 Federation of Indian Professionals · www.fipin.org</div>
    <div style="margin-top:10px;font-size:11px;color:rgba(255,255,255,0.3);">
      Need help? <a href="mailto:fippresidentoffice@gmail.com" style="color:rgba(255,255,255,0.5);">fippresidentoffice@gmail.com</a> · +91 99998 30938
    </div>
  </div>

</div>
</body>
</html>`;

  try {
    // Generate PDF invoice if payment was made
    let pdfAttachment = null;
    if (baseAmount) {
      try {
        const { generateInvoicePDF } = await import('./generate-invoice.js');
        const pdfBuf = await generateInvoicePDF({
          invoiceNo,
          invoiceDate:    new Date(),
          buyerName:      name,
          buyerEmail:     email,
          itemName:       courseTitle,
          baseAmount:     Number(baseAmount),
          transactionId,
          gstNumber,
          gstCompanyName,
          gstAddress,
        });
        pdfAttachment = {
          filename:    `FIP_Invoice_${String(courseTitle||'Course').replace(/[^a-z0-9]/gi,'_').slice(0,30)}.pdf`,
          content:     pdfBuf,
          contentType: 'application/pdf',
        };
      } catch(e) { console.warn('PDF generation failed (non-critical):', e.message); }
    }

    await transporter.sendMail({
      from:    `"FIP — Federation of Indian Professionals" <${process.env.GMAIL_USER}>`,
      to:      email,
      subject: emailSubject,
      html,
      ...(pdfAttachment ? { attachments: [pdfAttachment] } : {}),
    });
    return res.status(200).json({ sent: true });
  } catch (err) {
    console.error('Course confirmation email error:', err);
    return res.status(200).json({ sent: false, error: err.message });
  }
}