import { marked } from "marked";

export interface RenderEmailOptions {
  title: string;
  unsubscribeUrl?: string;
  previewText?: string;
}

/**
 * Compiles markdown into a clean, inline-styled HTML email that renders
 * consistently across Gmail, Apple Mail, Outlook, and mobile clients.
 */
export async function renderNewsletterEmail(
  markdownContent: string,
  options: RenderEmailOptions
): Promise<string> {
  const { title, unsubscribeUrl, previewText } = options;

  // Configure marked for clean HTML output
  marked.setOptions({
    gfm: true,
    breaks: true,
  });

  const parsedBody = await marked.parse(markdownContent);

  const fallbackUnsubscribe =
    unsubscribeUrl || "https://gourabmondal.vercel.app";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtml(title)}</title>
  ${
    previewText
      ? `<div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${escapeHtml(
          previewText
        )}</div>`
      : ""
  }
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; padding: 20px 16px !important; }
      .email-card { padding: 24px 18px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f6f8fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f6f8fa;">
    <tr>
      <td align="center" style="padding: 32px 12px 48px;">
        <!-- Email Container -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 620px;">
          <!-- Header Banner -->
          <tr>
            <td style="padding-bottom: 16px; text-align: left;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <span style="font-family: Georgia, serif; font-size: 16px; font-weight: bold; color: #111827; letter-spacing: -0.01em;">Gourab Mondal</span>
                    <span style="font-size: 13px; color: #6b7280; margin-left: 8px;">&middot; Newsletter</span>
                  </td>
                  <td align="right">
                    <a href="https://gourabmondal.vercel.app" target="_blank" style="font-size: 12px; color: #6b7280; text-decoration: none;">gourabmondal.vercel.app</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Card -->
          <tr>
            <td class="email-card" style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 36px 32px; text-align: left; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
              
              <!-- Issue Title -->
              <h1 style="font-family: Georgia, serif; font-size: 23px; font-weight: normal; color: #111827; line-height: 1.35; margin: 0 0 24px 0; padding-bottom: 16px; border-bottom: 1px solid #f3f4f6;">
                ${escapeHtml(title)}
              </h1>

              <!-- Parsed Markdown Body with Inlined Typography -->
              <div class="email-body" style="font-size: 15px; line-height: 1.65; color: #374151;">
                ${parsedBody}
              </div>

              <!-- Card Sign-off -->
              <div style="margin-top: 36px; padding-top: 20px; border-top: 1px solid #f3f4f6; font-size: 14px; color: #4b5563;">
                <p style="margin: 0 0 4px 0;">Best,</p>
                <p style="margin: 0; font-weight: 600; color: #111827;">Gourab Mondal</p>
                <p style="margin: 2px 0 0 0; font-size: 12px; color: #6b7280;">Backend & Systems Engineer &middot; Bangalore, IN</p>
              </div>
            </td>
          </tr>

          <!-- Footer with CAN-SPAM Unsubscribe -->
          <tr>
            <td style="padding-top: 24px; text-align: center; font-size: 12px; line-height: 1.6; color: #9ca3af;">
              <p style="margin: 0 0 6px 0;">
                You are receiving this because you subscribed to updates on
                <a href="https://gourabmondal.vercel.app" style="color: #6b7280; text-decoration: underline;">gourabmondal.vercel.app</a>.
              </p>
              <p style="margin: 0;">
                <a href="${fallbackUnsubscribe}" style="color: #6b7280; text-decoration: underline;">Unsubscribe with one click</a>
                &nbsp;&middot;&nbsp;
                <a href="https://github.com/assignment-sets" style="color: #6b7280; text-decoration: none;">GitHub</a>
                &nbsp;&middot;&nbsp;
                <a href="https://linkedin.com/in/gourab-mondal-dev" style="color: #6b7280; text-decoration: none;">LinkedIn</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
