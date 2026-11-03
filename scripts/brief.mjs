// Morning snapshot for every brand in data/config.json. Read-only: it never changes Stripe, stock or email.
// Usage: node brief.mjs  → prints one JSON object (see scripts/README.md).
// Keys come from the environment: STRIPE_SECRET_KEY, RESEND_API_KEY, and whatever each brand's
// stock_auth_env names (default ADMIN_SECRET). Config path: $BRAND_OPS_CONFIG or ../data/config.json.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(process.env.BRAND_OPS_CONFIG || join(here, "../data/config.json"), "utf8"));
const env = process.env;
const brands = Object.entries(config.brands || {});
// Stripe metadata.store value for each brand; sessions without one belong to the stripe_default brand (or the first).
const storeOf = Object.fromEntries(brands.map(([k, b]) => [b.stripe_store ?? k, k]));
const defaultKey = (brands.find(([, b]) => b.stripe_default) ?? brands[0])?.[0];
const brandOf = (meta) => storeOf[meta?.store] ?? defaultKey;

async function stripe(path, params = {}) {
  if (!env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");
  const u = new URL("https://api.stripe.com/v1/" + path);
  for (const [k, v] of Object.entries(params)) u.searchParams.append(k, v);
  const r = await fetch(u, { headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } });
  if (!r.ok) throw new Error(`stripe ${path} ${r.status}`);
  return r.json();
}
async function stripeAll(path, params) {
  const out = []; let after;
  for (let i = 0; i < 20; i++) {
    const p = { ...params, limit: "100" }; if (after) p.starting_after = after;
    const j = await stripe(path, p); out.push(...j.data);
    if (!j.has_more) break; after = j.data.at(-1).id;
  }
  return out;
}
async function getJson(url, secret) {
  const r = await fetch(url, { headers: secret ? { Authorization: `Bearer ${secret}` } : {} });
  if (!r.ok) throw new Error(`${new URL(url).host} ${r.status}`);
  return r.json();
}

const now = new Date();
const day = 86400;
const t = Math.floor(now / 1000);
const monthStart = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) / 1000);
const since = Math.min(monthStart, t - 7 * day);
const iso = (s) => new Date(s * 1000).toISOString();
const date = new Intl.DateTimeFormat("en-CA", { timeZone: config.owner?.timezone || "UTC" }).format(now);
const result = { date, generated: now.toISOString(), brands: {}, errors: [] };
for (const [k] of brands) result.brands[k] = { orders: [], checkouts: [], disputes: [], stock: [], pending_reviews: 0, audience_size: null };

try {
  const sessions = await stripeAll("checkout/sessions", { "created[gte]": String(since) });
  const paid = (s) => s.status === "complete" && s.payment_status === "paid";
  const intentBrand = {};
  for (const s of sessions) {
    const k = brandOf(s.metadata); const out = result.brands[k]; if (!out) continue;
    if (s.payment_intent) intentBrand[s.payment_intent] = k;
    const country = s.customer_details?.address?.country || null;
    if (s.created >= t - 7 * day) out.checkouts.push({
      id: s.id, started_at: iso(s.created), paid: paid(s), cart_value: (s.amount_subtotal ?? 0) / 100,
      shipping: (s.total_details?.amount_shipping ?? 0) / 100, currency: s.currency.toUpperCase(), country,
    });
    if (!paid(s)) continue;
    const order = { id: s.id, paid_at: iso(s.created), total: s.amount_total / 100, currency: s.currency.toUpperCase(), country };
    if (s.created >= t - 3 * day && out.orders.filter((o) => o.items).length < 15) {
      try { order.items = (await stripe(`checkout/sessions/${s.id}/line_items`)).data.map((li) => `${li.quantity}× ${li.description}`); } catch {}
    }
    out.orders.push(order);
  }
  const disputes = await stripe("disputes", { limit: "20" });
  for (const d of disputes.data.filter((d) => !["won", "lost", "warning_closed"].includes(d.status))) {
    const out = result.brands[intentBrand[d.payment_intent] ?? defaultKey]; if (!out) continue;
    out.disputes.push({ id: d.id, status: d.status, reason: d.reason, amount: d.amount / 100, currency: d.currency.toUpperCase(),
      opened: iso(d.created).slice(0, 10), due_by: d.evidence_details?.due_by ? iso(d.evidence_details.due_by).slice(0, 10) : null });
  }
} catch (e) { result.errors.push("stripe: " + (e.message || e)); }

for (const [k, b] of brands) {
  const out = result.brands[k];
  const secret = env[b.stock_auth_env || "ADMIN_SECRET"];
  try {
    if (b.stock_endpoint) {
      // Expected shape: { items: [{ id, name|colour, qty|available, preorder?, incoming?, incomingEta?, location?, hidden?, discontinued? }] }
      const j = await getJson(b.stock_endpoint, secret);
      out.stock = (j.items || []).filter((x) => !x.hidden && !x.discontinued).map((x) => ({
        id: x.id, name: x.name ?? x.colour ?? "", available: x.available ?? x.qty ?? 0, preorder: !!x.preorder,
        incoming: x.incoming || 0, eta: x.incomingEta || null, location: x.location || null,
      }));
    } else {
      // Fallback: Stripe products with metadata { store, kind: "stock", stock, status }.
      const store = b.stripe_store ?? k;
      out.stock = (await stripeAll("products", {}))
        .filter((p) => (p.metadata?.store ?? defaultKey) === store && p.metadata?.kind === "stock")
        .map((p) => ({ id: p.metadata.sku || p.id, name: p.name, available: Number(p.metadata.stock) || 0, preorder: p.metadata.status === "preorder", location: p.metadata.location || null }))
        .sort((a, c) => String(a.id).localeCompare(String(c.id)));
    }
  } catch (e) { result.errors.push(`${k} stock: ` + (e.message || e)); }

  if (b.reviews_endpoint) {
    try { out.pending_reviews = ((await getJson(b.reviews_endpoint, secret)).items || []).length; }
    catch (e) { result.errors.push(`${k} reviews: ` + (e.message || e)); }
  }

  if (b.resend_audience_id) {
    try {
      if (!env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set");
      const j = await getJson(`https://api.resend.com/audiences/${b.resend_audience_id}/contacts`, env.RESEND_API_KEY);
      out.audience_size = (j.data || []).filter((c) => !c.unsubscribed).length;
    } catch (e) { result.errors.push(`${k} audience: ` + (e.message || e)); }
  }
}

console.log(JSON.stringify(result, null, 1));
