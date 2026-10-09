import "server-only";

// Outbound email through Resend's HTTP API. Entirely optional: without
// RESEND_API_KEY and EMAIL_FROM the portal still works and links are passed on
// by hand. EMAIL_FROM must be on a domain verified in Resend,
// e.g. "PPIM Consulting <portal@ppimconsulting.co.nz>".
export const emailEnabled = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

type Attachment = { filename: string; content: Buffer };

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// Plain, short, no tracking. `paragraphs` are escaped; `button` is optional.
export async function sendEmail(opts: {
  to: string;
  subject: string;
  paragraphs: string[];
  button?: { label: string; url: string };
  attachments?: Attachment[];
}): Promise<{ ok: boolean; error?: string }> {
  if (!emailEnabled()) return { ok: false, error: "Email isn't set up on this server." };

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#0d1d2e;max-width:520px">
${opts.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("\n")}
${opts.button ? `<p><a href="${escapeHtml(opts.button.url)}" style="display:inline-block;background:#0d1d2e;color:#ffffff;text-decoration:none;font-weight:bold;padding:10px 18px;border-radius:8px">${escapeHtml(opts.button.label)}</a></p>` : ""}
<p style="color:#4b5d6e;font-size:13px">PPIM Consulting staff portal</p>
</div>`;
  const text = [...opts.paragraphs, opts.button ? `${opts.button.label}: ${opts.button.url}` : ""].filter(Boolean).join("\n\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [opts.to],
        subject: opts.subject,
        html,
        text,
        attachments: opts.attachments?.map((a) => ({ filename: a.filename, content: a.content.toString("base64") })),
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("[email]", res.status, body);
      let reason = "";
      try {
        reason = (JSON.parse(body) as { message?: string }).message ?? "";
      } catch {
        reason = body.slice(0, 200);
      }
      return { ok: false, error: `the email service refused it (${res.status}${reason ? `: ${reason}` : ""})` };
    }
    return { ok: true };
  } catch (e) {
    console.error("[email]", e);
    return { ok: false, error: "Couldn't reach the email service." };
  }
}
