// Sends outreach emails the owner marked ready in the roster. Nothing else.
// Usage: node send.mjs outbox.json [--dry]
// outbox.json: [{ "id": "<roster id>", "brand": "<brand key in config.json>", "to": "a@b.com", "subject": "...", "body": "plain text" }]
// Prints [{ id, ok, resendId | error }]. At most send_limit_per_brand (default 15) emails per brand per run.
// Sender: each brand's email_sender (name from sender_name or name, replies to reply_to or the sender) in data/config.json.
// Key: RESEND_API_KEY from the environment. Config path: $BRAND_OPS_CONFIG or ../data/config.json.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(process.env.BRAND_OPS_CONFIG || join(here, "../data/config.json"), "utf8"));
const KEY = process.env.RESEND_API_KEY;
if (!KEY) { console.error("RESEND_API_KEY is not set"); process.exit(1); }

const isEmail = (s) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s || "");
const BRAND = Object.fromEntries(Object.entries(config.brands || {}).map(([k, b]) => [k, isEmail(b.email_sender) ? {
  from: `${b.sender_name ?? b.name ?? k} <${b.email_sender}>`,
  replyTo: b.reply_to || b.email_sender,
  domain: b.email_sender.split("@")[1],
} : null]));
const LIMIT = config.send_limit_per_brand ?? 15;
const [file, flag] = process.argv.slice(2);
const dry = flag === "--dry";
const outbox = JSON.parse(readFileSync(file, "utf8"));

const esc = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const html = (body) =>
  `<div style="max-width:560px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#222">` +
  body.trim().split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px">${esc(p).replace(/\n/g, "<br>")}</p>`).join("") + `</div>`;

const domains = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${KEY}` } })
  .then((r) => r.json()).then((j) => Object.fromEntries((j.data || []).map((d) => [d.name, d.status])));

const sent = {};
const results = [];
for (const m of outbox) {
  if (!(m.brand in BRAND)) { results.push({ id: m.id, ok: false, error: "unknown brand" }); continue; }
  const b = BRAND[m.brand];
  if (!b) { results.push({ id: m.id, ok: false, error: `no email_sender address for ${m.brand} in config.json` }); continue; }
  if (domains[b.domain] !== "verified") { results.push({ id: m.id, ok: false, error: `${b.domain} is not verified in Resend (${domains[b.domain] || "missing"})` }); continue; }
  if (!isEmail(m.to)) { results.push({ id: m.id, ok: false, error: "no valid address" }); continue; }
  if ((sent[m.brand] ?? 0) >= LIMIT) { results.push({ id: m.id, ok: false, error: "daily limit reached, kept for tomorrow" }); continue; }
  if (dry) { results.push({ id: m.id, ok: true, dry: true }); sent[m.brand] = (sent[m.brand] ?? 0) + 1; continue; }
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: b.from, reply_to: b.replyTo, to: [m.to], subject: m.subject, html: html(m.body), text: m.body }),
  });
  const j = await r.json().catch(() => ({}));
  results.push(r.ok ? { id: m.id, ok: true, resendId: j.id } : { id: m.id, ok: false, error: `${r.status} ${j.message || ""}` });
  if (r.ok) sent[m.brand] = (sent[m.brand] ?? 0) + 1;
  await new Promise((res) => setTimeout(res, 1500));
}
console.log(JSON.stringify(results, null, 1));
