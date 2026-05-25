import formidable from 'formidable';
import nodemailer from 'nodemailer';
import fs from 'fs';

// Disable Vercel's built-in body parser so we can handle multipart/form-data ourselves
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Parse multipart/form-data using formidable.
 */
function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10 MB max
      keepExtensions: true,
    });
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

/**
 * Create a Nodemailer transporter using Gmail SMTP.
 * Requires a Gmail App Password (not your regular Gmail password).
 * See: https://myaccount.google.com/apppasswords
 */
function createTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // true for port 465 (SSL)
    auth: {
      user: process.env.GMAIL_USER,       // e.g. pb.gdghau@gmail.com
      pass: process.env.GMAIL_APP_PASSWORD, // 16-character App Password from Google
    },
  });
}

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { fields, files } = await parseForm(req);

    // formidable v3 returns arrays for all fields
    const toEmail = Array.isArray(fields.email) ? fields.email[0] : fields.email;
    const photoFile = Array.isArray(files.photo) ? files.photo[0] : files.photo;

    if (!toEmail || !photoFile) {
      return res.status(400).json({ error: 'Missing required fields: email and photo.' });
    }

    // Read the uploaded image buffer
    const photoBuffer = fs.readFileSync(photoFile.filepath);
    const fileName = `gdg-photobooth-${Date.now()}.jpg`;

    const dateStr = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const emailHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Your GDG on Campus HAU Photo Strip</title>
        </head>
        <body style="margin:0;padding:0;background-color:#0d0d0d;font-family:'Segoe UI',Arial,sans-serif;color:#e0e0e0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:40px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#111111;border:1px solid #222222;border-top:3px solid #00f5ff;">

                  <!-- Header -->
                  <tr>
                    <td style="padding:32px 40px 24px;border-bottom:1px solid #1a1a1a;">
                      <p style="margin:0 0 6px;font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:#00f5ff;font-family:monospace;">GDG ON CAMPUS HAU // OVERRIDE 2026</p>
                      <h1 style="margin:0;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:0.05em;">Your Photo Strip Is Ready</h1>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td style="padding:32px 40px;">
                      <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#aaaaaa;">Dear Attendee,</p>
                      <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#aaaaaa;">
                        Thank you for joining us at <strong style="color:#ffffff;">GDG on Campus HAU — OVERRIDE 2026</strong>.
                        We're thrilled to share your exclusive event photo strip!
                      </p>
                      <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#aaaaaa;">
                        Your photo strip is attached to this email as a high-quality JPEG image.
                        Feel free to save it and share it as a keepsake from the event.
                      </p>

                      <!-- Divider -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
                        <tr><td style="border-top:1px solid #1a1a1a;"></td></tr>
                      </table>

                      <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#555;font-family:monospace;">Event Details</p>
                      <table cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding:4px 16px 4px 0;font-size:12px;color:#555;font-family:monospace;">DATE</td>
                          <td style="padding:4px 0;font-size:12px;color:#e0e0e0;">${dateStr}</td>
                        </tr>
                        <tr>
                          <td style="padding:4px 16px 4px 0;font-size:12px;color:#555;font-family:monospace;">ORGANIZER</td>
                          <td style="padding:4px 0;font-size:12px;color:#e0e0e0;">Google Developer Groups on Campus HAU</td>
                        </tr>
                        <tr>
                          <td style="padding:4px 16px 4px 0;font-size:12px;color:#555;font-family:monospace;">POWERED BY</td>
                          <td style="padding:4px 0;font-size:12px;color:#00f5ff;">Google Developer Groups</td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding:24px 40px;border-top:1px solid #1a1a1a;background:#0a0a0a;">
                      <p style="margin:0 0 6px;font-size:11px;color:#444;line-height:1.6;">
                        This email was sent because you requested your photo at the GDG on Campus HAU Photobooth.
                        If this was sent in error, you may safely disregard it.
                      </p>
                      <p style="margin:0;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#333;font-family:monospace;">
                        © 2026 GDG on Campus HAU — All Rights Reserved
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const transporter = createTransporter();

    // Verify the SMTP connection before attempting to send
    await transporter.verify();

    const info = await transporter.sendMail({
      from: `"GDG on Campus HAU Photobooth" <${process.env.GMAIL_USER}>`,
      to: toEmail,
      subject: '📸 Your GDG on Campus HAU Photo Strip — OVERRIDE 2026',
      html: emailHtml,
      attachments: [
        {
          filename: fileName,
          content: photoBuffer,
          contentType: 'image/jpeg',
        },
      ],
    });

    console.log('Email sent. Message ID:', info.messageId);
    return res.status(200).json({ success: true, messageId: info.messageId });

  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: 'Internal Server Error: ' + err.message });
  }
}
