# Daily ops

Schedule: every morning, about an hour after the previous day closes in your timezone.
Tools it needs: a shell on the machine that holds `scripts/`, a browser signed into your inboxes, Google Ads and Instagram, read access to your payment provider, write access to the page and the roster.
Fill every `{{...}}` from `data/config.json`.

---

Daily operations run for {{owner.name}}'s shops: {{brands.*.name}} ({{brands.*.domain}}). Goal: {{owner.goal}}. This run measures progress toward it every day and keeps the routine work moving. Write anything for the owner in {{owner.language}}, short. Rule: everything goes on ONE page (the Morning Brief); do NOT message the owner unless something needs them today. This is the only daily shop task: it covers sales tracking, outreach sending, inbox, Instagram, web mentions and rising search terms.

NEVER: refund, change prices or stock, change ads (budgets, bids, keywords), publish or reject reviews, reply to customers or contacts, accept or submit payment disputes, post, comment, like, follow, or send anything that is not an outreach email the owner approved (status "ready") in the roster. Never enter passwords; if a site is logged out in the browser, skip that step and record it in the todo list. If a connected analytics tool has no usable access, skip it and never mention it.

PLACES
- Scripts: {{places.scripts_dir}} has brief.mjs (read-only snapshot of orders, stock, pending reviews and email audience), send.mjs (sends emails for {{brands.brand_a.name}} via your email provider from {{brands.brand_a.email_sender}}), rows.mjs (builds the page's rows), extras.json (yesterday's extras: carry its todo list forward), scoreboard.json (daily sales history; create if missing). Keys are read by the scripts from {{places.env_file}}; never print or copy them.
- Roster: {{places.roster}}. Collection "people" holds creators, editors (platform "press") and stockists (platform "stockist"): fields brands, outreach.<brand> = {status new|draft|ready|sent|replied|yes|no, sent_on, draft:{channel dm|email, subject, body}, note}. Doc meta/gifts holds {held, promised_outside_roster} per brand.
- Page: {{places.page}}: datasets "brief" and "scoreboard".
- Browser: each brand's inbox ({{brands.*.inbox}}); for a shared personal inbox read ONLY messages sent to the brand address that reply to outreach or come from customers, ignore everything else. Google Ads for each shop. Instagram {{brands.*.instagram}}.

SHOP FACTS
{{for each brand: name, markets, products with prices and shipping notes, delivery rule, promo codes with dates, Christmas last-order dates, returns window, review handling, regional rules and what must never be mentioned to which contacts, gift quota}}

STEPS
1. Snapshot: run `cd {{places.scripts_dir}} && node brief.mjs > brief-latest.json`, then read it (errors[] means a part failed; keep going). If the machine can't be reached, do steps 6 and 7 only, then tell the owner in one line that the machine was unreachable.

2. SCOREBOARD (the main job). For yesterday (owner's timezone), per brand: paid orders, revenue, average order value, checkout sessions started vs paid, and for each unpaid checkout its cart value and shipping charged (from brief-latest.json; if it lacks checkout sessions, read them from the payment provider, read-only). Split orders by region where the brand sells regionally. In the browser open Google Ads for each shop (read-only), yesterday: cost, clicks, conversions per campaign. Compute cost per order (ad cost ÷ orders, "—" if 0 orders) and checkout completion rate. Append one row per brand to scoreboard.json (schema in data/scoreboard.schema.json); replace a row with the same date+brand. Then work out: total orders yesterday and the 7-day average across all brands; the current milestone = {{owner.milestones}} in order, moving up when the 7-day average reaches it; days in a row with zero orders per brand. Publish scoreboard.json to the page's "scoreboard" dataset exactly like step 12.
   Add todos (kind "decide", one per issue, stable keys so they don't repeat): a campaign that spent more than £40 over the last 3 days with no orders ("ads-<brand>-<campaign>"); 3+ abandoned checkouts yesterday on one brand where shipping was over 20% of cart value ("abandon-<brand>"); a brand with zero orders for 3 days in a row ("zero-<brand>"); Google Ads still showing "set up conversion tracking" or zero recorded conversions while the payment provider has orders ("ads-tracking-<brand>").

3. Roster: list collection "people" (paginate). Count per brand: drafts, ready, sent (sent+replied+yes), replied, yes; also regional subsets and stockists.

4. Send approved emails (max 15 per brand per day, oldest approval first; only entries whose outreach.<brand>.status is "ready", draft.channel is "email", and the doc has an email).
   - Brands with an email provider: write the batch as JSON [{id, brand, to, subject, body}] to outbox.json, run `node send.mjs outbox.json`; for each ok result update that doc: status "sent", sent_on today, pinned with the version you read. Never send a regional contact an email that mentions a product not sold in their region: skip it and add a todo to fix the draft.
   - Brands that send from a mailbox in the browser: compose one email per entry (To, Subject, Body exactly as approved, plain text), send, wait about 20 seconds between sends, then mark the doc sent the same way. If the mailbox isn't signed in as the brand address, send nothing and add a todo. If an approved body still uses an old brand name, don't send it; add a todo to update the draft.
   - Entries with channel "dm" (or no email) are the owner's to send; leave them.

5. Inbox and Instagram (look, don't interact). Each brand inbox, last 26 hours: replies from creators, agents, editors and shops. Match to a roster doc (email, name, shop, handle); set status "replied", or "yes" when a creator or editor clearly accepts the gift or a shop clearly wants samples or to stock; short summary in outreach.<brand>.note (never store home addresses or phone numbers; write "address is in the email"). A shop asking about terms, prices or quantities becomes a todo {kind:"decide", label:"Reply to shop <name>", text:<their question in one line>}. Add each to extras.email {brand, from, subject, note, at}. Customer emails (orders, sizing, delivery): add a todo "Reply to customer <name>" with one line, don't reply. Instagram: open each brand's tagged page, note posts from the last 2 days; if the browser is signed in as the brand, check DMs for roster contacts' replies (update status as above). Add each to extras.instagram {brand, who, note, link, at}.

6. Mentions on the web (last ~36 hours): web search (at least one thorough query per brand) for the brand name, handle, domain, product names, and any old brand name. Ignore unrelated uses of the word. Add real ones to extras.mentions {brand, source, note, link, at}. A copycat, confusingly similar new brand or trademark problem is also a todo {kind:"decide"}.

7. Rising search terms: 3–6 rising terms from fashion press, TikTok and Instagram trend coverage, Pinterest trends, retailer trending pages and seasonal angles, within each brand's space ({{brands.*.space}}). Read words-history.json (last 30 days) and only repeat a term with new evidence. Add each to extras.words {brand, term, note (evidence + one-line idea), link}; append to words-history.json. {{brands.*.never_suggest_terms}}.

8. Gifts: per brand, promised = entries with status "yes" + meta/gifts.promised_outside_roster. Every new creator or editor "yes" becomes a todo {kind:"decide", brand, label:"Send gift to @handle", text:"address is in the email or DM; mark the roster when sent"}; for regional gifts add where to ship from. If promised would pass the held quota, add todo "Gift quota about to run out" and do not promise more.

9. Todo list: start from extras.json's todo (drop resolved items and deadlines more than 1 day past). Stock: items with low stock that aren't preorder, per location, as kind "decide" (key "stock-<brand>-<id>"). Deadlines from config: from 7 days before each Christmas last-order date, add it (key "xmas-<region>-<product>", due that date); returns window start; promo codes that must exist in the payment provider by a date; the day before a promo ends. Disputes and pending reviews come from brief.mjs automatically.

10. Write extras.json {gifts:{held, used}, outreach:[...], todo:[...], instagram:[...], email:[...], mentions:[...], words:[...]} (schema in data/extras.schema.json), then `node rows.mjs brief-latest.json extras.json > rows.json`.

11. Publish the brief: upload rows.json to the page as brief-rows.json, point the "brief" dataset at it (source.url, source.name, updated {at, by:"agent"}), then delete only the previous asset that dataset pointed to.

12. Publish the scoreboard the same way (scoreboard-rows.json, dataset "scoreboard", title "How far from {{owner.goal}}", description "Read every morning from the payment provider and Google Ads: yesterday's orders, revenue, checkouts and ad spend.", staleAfterHours 48), deleting only its previous asset.

13. Message the owner ONLY if: {{message_rules.daily_message_only_if}}. One short line per item, starting with "Yesterday N orders (7-day average M)", and a pointer to the page. Otherwise send nothing.
