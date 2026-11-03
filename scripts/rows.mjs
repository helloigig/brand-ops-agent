// Turns brief-latest.json (from brief.mjs) + extras.json (written by the morning agent) into rows.json,
// the one file the Morning Brief page reads.
// Usage: node rows.mjs brief-latest.json extras.json > rows.json
// Row columns: section, brand, key, label, value, text, due, link, kind (todo: decide | deadline | waiting)
// Brand names, domains and currencies come from $BRAND_OPS_CONFIG or ../data/config.json (optional).
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const cf = process.env.BRAND_OPS_CONFIG || join(here, "../data/config.json");
const config = existsSync(cf) ? JSON.parse(readFileSync(cf, "utf8")) : {};
const [bf, ef] = process.argv.slice(2);
const b = JSON.parse(readFileSync(bf, "utf8"));
const x = ef ? JSON.parse(readFileSync(ef, "utf8")) : {};
const rows = [];
const add = (r) => rows.push({ section: r.section, brand: r.brand ?? "", key: r.key ?? "", label: r.label ?? "", value: r.value ?? null, text: r.text ?? "", due: r.due ?? "", link: r.link ?? "", kind: r.kind ?? "" });

const gen = Date.parse(b.generated || b.date) || Date.now();
const monthStart = Date.UTC(new Date(gen).getUTCFullYear(), new Date(gen).getUTCMonth(), 1);
const H = 3600e3;

add({ section: "meta", key: "generated", text: b.generated || b.date });
for (const [brand, s] of Object.entries(b.brands || {})) {
  const cfg = config.brands?.[brand] || {};
  const cur = (cfg.currency || config.owner?.currency || "GBP").toUpperCase();
  const orders = s.orders || [];
  for (const [key, from] of [["24h", gen - 24 * H], ["7d", gen - 7 * 24 * H], ["mtd", monthStart]]) {
    const list = orders.filter((o) => Date.parse(o.paid_at) >= from);
    const mine = list.filter((o) => (o.currency || cur).toUpperCase() === cur);
    add({ section: "kpi", brand, key: "orders_" + key, value: list.length });
    add({ section: "kpi", brand, key: "revenue_" + key, value: Math.round(mine.reduce((n, o) => n + o.total, 0) * 100) / 100,
      text: list.length > mine.length ? `plus revenue in other currencies (shown in ${cur})` : cur });
  }
  const co = s.checkouts || [];
  if (co.length) {
    add({ section: "kpi", brand, key: "checkouts_7d", value: co.length });
    add({ section: "kpi", brand, key: "abandoned_7d", value: co.filter((c) => !c.paid).length });
  }
  if (s.audience_size != null) add({ section: "kpi", brand, key: "audience", value: s.audience_size });
  orders.filter((o) => Date.parse(o.paid_at) >= gen - 72 * H).slice(0, 15).forEach((o, i) =>
    add({ section: "order", brand, key: brand + "-" + i, label: (o.items || []).join(", ") || "Order", value: o.total, text: [o.country, o.currency].filter(Boolean).join(" "), due: o.paid_at }));
  for (const r of s.stock || []) add({ section: "stock", brand, key: `${brand}-${r.id}`, label: `${r.id} ${r.name || ""}`.trim(), value: r.available,
    text: [r.location, r.preorder ? "pre-order" : "in stock", r.incoming ? `${r.incoming} incoming${r.eta ? " (" + r.eta + ")" : ""}` : ""].filter(Boolean).join(" · ") });
  for (const d of s.disputes || []) add({ section: "todo", kind: "decide", brand, key: d.id,
    label: `Stripe dispute ${d.amount} ${d.currency || ""}, ${d.reason === "product_not_received" ? "customer says it never arrived" : d.reason || "no reason given"}`.replace(/\s+,/, ","),
    text: d.status === "needs_response" ? "Submit evidence or it is lost automatically" : "With the bank, waiting for a decision", due: d.due_by || "", link: `https://dashboard.stripe.com/disputes/${d.id}` });
  if (s.pending_reviews) add({ section: "todo", kind: "decide", brand, key: `${brand}-reviews-pending`,
    label: `${s.pending_reviews} review${s.pending_reviews === 1 ? "" : "s"} waiting for you`, text: "Publish or reject them in the shop admin",
    link: cfg.reviews_admin_url || (cfg.domain ? `https://${cfg.domain}/admin/reviews` : "") });
}
for (const e of b.errors || []) add({ section: "todo", kind: "decide", brand: "system", key: "err-" + rows.length, label: "Part of the brief could not be read", text: e });

const g = x.gifts;
if (g) add({ section: "gift", brand: g.brand ?? "", key: "gift_left", label: "Gifts left", value: g.held - g.used, text: `${g.used} of ${g.held} promised` });
for (const o of x.outreach || []) for (const k of ["drafts", "ready", "sent", "replied", "yes"]) add({ section: "outreach", brand: o.brand, key: `${o.brand}-${k}`, label: k, value: o[k] ?? 0 });
for (const t of x.todo || []) add({ section: "todo", ...t, key: t.key || "t-" + rows.length });
for (const i of x.instagram || []) add({ section: "ig", brand: i.brand, key: "ig-" + rows.length, label: i.who, text: i.note, due: i.at || "", link: i.link || "" });
for (const m of x.email || []) add({ section: "mail", brand: m.brand, key: "mail-" + rows.length, label: m.from, text: m.note || m.subject, due: m.at || "" });
for (const m of x.mentions || []) add({ section: "mention", brand: m.brand, key: "mention-" + rows.length, label: m.source, text: m.note, due: m.at || "", link: m.link || "" });
for (const w of x.words || []) add({ section: "word", brand: w.brand, key: "word-" + rows.length, label: w.term, text: w.note, link: w.link || "" });
console.log(JSON.stringify(rows));
