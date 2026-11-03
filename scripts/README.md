# Scripts

Three small Node scripts that the daily agent runs on the machine that holds your keys. The agent never sees the keys; it only runs the scripts and reads their output. The versions here are written against Stripe, an optional admin API on your own site (stock, pending reviews) and Resend; swap the fetch calls if your stack differs and keep the interfaces.

Keys come only from the environment: `STRIPE_SECRET_KEY`, `RESEND_API_KEY`, and `ADMIN_SECRET` (or whatever a brand's `stock_auth_env` names). Brand names, domains, sender addresses and endpoints come from `data/config.json` (set `BRAND_OPS_CONFIG` to use another path); see the brand fields in `data/config.example.json`.

## brief.mjs — read-only snapshot

Prints one JSON object to stdout. Must never write to any service.

```json
{
  "date": "2026-11-02",
  "brands": {
    "brand_a": {
      "orders": [{ "id": "...", "paid_at": "...", "total": 120.0, "currency": "GBP", "country": "GB" }],
      "checkouts": [{ "id": "...", "started_at": "...", "paid": false, "cart_value": 95.0, "shipping": 15.0, "country": "AU" }],
      "disputes": [{ "id": "...", "due_by": "...", "amount": 120.0 }],
      "stock": [{ "id": "...", "name": "...", "available": 2, "preorder": false, "location": "UK" }],
      "pending_reviews": 3,
      "audience_size": 412
    }
  },
  "errors": []
}
```

Sources I use: Stripe (orders, checkout sessions, disputes), the shop's own stock endpoint, Resend (audience size). Put a failed part's message in `errors[]` and keep going.

## send.mjs — send a batch of outreach emails

`node send.mjs outbox.json` where outbox.json is `[{ "id", "brand", "to", "subject", "body" }]`. Sends plain-text emails from the brand's sender address and prints `[{ "id", "ok": true | false, "error"? }]`. The agent updates the roster only for `ok: true`. Rate-limit yourself; never retry a bounce.

## rows.mjs — build the page

`node rows.mjs brief-latest.json extras.json > rows.json`. Merges the snapshot and the agent's extras (todo list, outreach counts, inbox notes, mentions, rising terms) into whatever row format your page renders. Keep the page one screen: numbers first, then decisions, then everything else.

## Files the scripts share

- `scoreboard.json` — one row per brand per day (see data/scoreboard.schema.json)
- `extras.json` — the agent's working memory between days (see data/extras.schema.json)
- `words-history.json` — rising terms already suggested, so they aren't repeated
- `geo-history.json` — weekly AI-search measurements (see data/geo-history.schema.json)
- `geo-topics.json` — article topics already written
