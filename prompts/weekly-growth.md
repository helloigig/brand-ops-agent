# Weekly growth

Schedule: Saturday morning.
Tools it needs: a shell on the machine that holds `scripts/` and the daily data, a browser (Google Ads, Search Console, the live sites, ChatGPT, Perplexity, Google, Gmail Sent, Instagram), push access to the shop repos, write access to the page and the roster.
Fill every `{{...}}` from `data/config.json`.

---

Weekly run (Saturday morning) for {{owner.name}}'s shops: {{brands.*.name}}. Goal: {{owner.goal}}. This run finds the biggest thing holding sales back each week and fixes or prepares a fix for it. It is the only weekly shop task: growth review, AI search (GEO), site fixes, creators, editors and stockists. Write anything for the owner in {{owner.language}}, short.

NEVER: send any DM or email, follow, like, comment, post, change ads (budgets, bids, keywords), change prices or stock, merge a PR or deploy. You measure, research, draft and open PRs. Never enter passwords; if a site is logged out, skip that step and say so. Never write fake reviews or testimonials, never post anywhere as a customer or under fake accounts, never add hidden text, keyword stuffing or instructions aimed at AI crawlers, never buy links, never claim anything about a product that its site doesn't already state.

PR RULE: at most ONE open PR per repo from this run. If an open PR from an earlier run already exists in that repo and isn't merged, add your commits to its branch (and update its description) instead of opening another; never build stacks of PRs.

BRANDS
{{for each brand: name, domain, products and prices, Instagram, email sender, founder byline, press line and how it may be used, copy rules, creator conflicts, regional rules, repo, repo notes to read first, build check, gift quota}}

PART 0: GROWTH REVIEW (do this first)
0a. Read {{places.scripts_dir}}/scoreboard.json (written daily) and run `node brief.mjs > brief-week.json`. Per brand (and per region where the brand sells regionally), last 7 days vs the 7 before: orders, revenue, AOV, checkouts started vs paid, abandoned value and shipping on abandoned carts, ad cost, cost per order.
0b. Google Ads (browser, read-only), each shop, last 7 days: per campaign cost, clicks, conversions; search terms with spend and no conversion; products with clicks and no sales; whether conversion tracking is recording purchases. List up to 10 negative keywords and any campaign worth pausing or scaling, each with the numbers, as todos kind "decide" in extras.json (key "weekly-ads-<brand>-<short>"; read the file first and keep everything else). The owner changes ads themselves. {{brands.*.never_negative_keywords}}.
0c. Funnel on the live sites: open the home page, the top product page and checkout up to the payment step (stop there) on each site, on a phone-width window too, and regional pages where they exist. Note anything that blocks buying (unclear delivery cost or lead time, missing size info, slow page, broken image, a promo code that doesn't apply, regional shoppers seeing the wrong currency or products not sold in their region).
0d. Pick the ONE biggest bottleneck per brand this week (traffic, product page to cart, cart to paid, or repeat buyers) with the evidence. That bottleneck decides what the Part B PR fixes first.
0e. Indexing: Search Console Pages report per domain (indexed count, regional pages), and a search-engine site: query result count. Note last week's numbers from meta/lastrun.

PART A: AI SEARCH (GEO)
Tracked questions (identical every week): {{geo_questions}}.
A1. MEASURE (browser, new tabs): ask each in ChatGPT (new chat), Perplexity (skip if it needs sign-in) and Google (with the right country, AI Overview or AI Mode if shown). Record position (1 = first brand named, 0 = not named; count old brand names too), top_brands (first 3), cited (main domains), and for Google whether the domain appears in the top 10 and the shopping carousel. Pause a few seconds between questions and longer every 20; if an engine shows a captcha or a hard limit, stop that engine and record how far you got. In peak season measure the seasonal sets first.
A2. STORE: append to geo-history.json (schema in data/geo-history.schema.json), key = week|brand|engine|prompt. Publish it to the page's "geo" dataset the same way the daily run publishes the brief, deleting only the previous asset.
A3. DIAGNOSE each question where a brand isn't 1st or 2nd: (a) no clear page answers it; (b) answers lean on third-party roundups, gift guides, Reddit or marketplaces without the brand; (c) technical (crawlability, schema, canonical, hreflang, llms.txt, Bing index, Merchant Center feed fields, wrong facts quoted such as old delivery terms).
A4. For (b): the 3 most-cited third-party pages per set that don't mention the brand → find the author or editor and a real email on the outlet's site → roster press entries (Part C) with a pitch naming the article. Marketplaces and review sites that keep appearing become todos for the owner.
A5. First Saturday of the month: technical audit of each site (robots.txt allows the AI crawlers you want; sitemap; product schema; hreflang; llms.txt; feeds valid; speed).

PART B: SITE PR (follow the PR RULE; small and safe)
Getting the code: clone each brand repo (depth 1, then fetch main and any open PR branch you'll build on). If you can't push, write the planned change to pr-plan-<brand>-<date>.md and add a todo. Open or update PRs through the API if the CLI is blocked.
Order of work: first the Part 0 bottleneck fix, then A3 (a) and (c) gaps, then at most one article per brand. PR title "Weekly: <short summary>" (or, when adding to an existing open PR, add a dated section to its description) listing the bottleneck it targets (with numbers) and the tracked questions. Do not merge.
- Per brand: read {{brands.*.repo_notes}} first; improve an existing page rather than adding one; never re-create a retired URL; follow the brand's copy rules; the build check must pass.
- Article: genuinely useful, brand voice, answers its question in the first paragraph, accurate claims only, links to product pages. Topics tied to tracked questions where the brand isn't top 2 (seasonal sets first in season); keep geo-topics.json [{brand, topic, question, why, done_week}] so topics never repeat.

PART C: CREATORS, EDITORS AND STOCKISTS (roster {{places.roster}}, collection "people")
Doc id "ig_<handle>", "tt_<handle>", "press_<firstname-lastname>" or "shop_<name-slug>", lowercase. Fields: handle, platform ("instagram"|"tiktok"|"press"|"stockist"), name, followers, followers_checked, er (percent, one decimal), er_source, city, region, email (only an address actually seen), agency, tags, conflict, note, brands, outreach (brand → {status, why, note, sent_on, draft:{channel, subject, body, why}}), sources, added, added_by ("weekly run"). Statuses new, draft, ready (owner approved; the daily run sends approved emails next morning), sent, replied, yes, no. Never change a status other than new→draft, never edit a draft whose status isn't "draft".
C1. Read the whole collection first; never duplicate (handle, email, name, website). Any "draft" that still uses an old brand name: rewrite it.
C2. Creators: about 8 new per brand from recent street style, best-dressed lists, gift guides, agency rosters, and people like those marked yes. Also draft for up to 15 existing "new" entries per brand that have an email, best fits first.
C2b. Regional (in season): about 6 new regional fashion creators (10k–300k followers), about 4 regional fashion or gift-guide editors, about 5 stockists (independent boutiques, concept stores, resort and hotel shops; never brands that make a competing product). Stockist pitch: 80–120 words, one concrete detail about the shop, what the brand is, that stock is local so delivery is quick, an offer of a small sale-or-return selection, ask what terms they usually work with, no prices or commission numbers, "reply and I'll send the lookbook and a few samples". For stockists with status "sent" 7+ days ago and no reply, draft one follow-up ("Re: <original subject>", 40–60 words); never a second follow-up.
C3. Verify creators in the browser: followers, bio email or agency, ER = average (likes+comments) of the 9 latest non-pinned posts ÷ followers × 100 (or a published third-party rate, noting the source), conflicts in the grid. At most 40 profiles a run, a few seconds apart.
C4. Editors: the outreach mailbox's Sent folder, last 30 days: make sure each editor pitch is in the roster as press (status sent, sent_on); for any sent 6+ days ago with no reply, draft a follow-up. Then up to 5 new editors per brand (seasonal gift-guide editors first), only with an email you actually found. Include the A4 editors.
C5. Drafts: warm, 60–110 words (stockists 80–120), one concrete detail showing you looked, the offer (a gifted product), an easy yes ("just reply with an address"), sign off with the owner's first name + brand name. Never mention price or payment. One-line reason in draft.why.
C6. Write roster changes in batches (pin updates with the version you read). Then write meta/lastrun {date, added, drafted, indexed, bottleneck, notes}.

PART D: PAST CUSTOMERS
Draft one short email per brand to past customers who opted in to marketing, built around this week's best reason to buy (new colour, last-order date, a promo, gifting, press, the season). Save each to newsletter-<brand>-<date>.md (subject, preview line, body, one link) and add a todo "Review this week's customer email" pointing to the file. Never send.

MESSAGE (at most {{message_rules.weekly_message_max_lines}} short lines): this week's orders per brand (split by region where relevant) vs last week and vs the goal; each brand's bottleneck in one line; the PR link (or why there is none); AI-search answers naming the brand per set vs last week; creators, editors and stockists drafted and waiting; anything blocked. End with: "Mark drafts ready in the roster and they go out tomorrow morning; details on the page."
