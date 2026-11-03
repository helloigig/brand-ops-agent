# brand-ops-agent

Run a one-person brand with scheduled AI agents.

This is the set of prompts, scripts and conventions I use to run two small
e-commerce brands on my own: one agent reads sales and ads every morning and
keeps one page up to date, one agent does a growth review every Saturday and
opens a pull request against the shop, and a few lighter agents keep me
informed. I don't talk to them. They write to one page, and they only message
me when something needs a decision today.

Everything here runs on Claude scheduled tasks (claude.ai), but the prompts are
plain text and the scripts are plain Node, so any agent runtime that can run a
shell command and read a file will do.

## What the agents do

| Agent | When | What it does | Writes to |
| --- | --- | --- | --- |
| Daily ops | every morning | Reads yesterday's orders, checkouts and ad spend, sends approved outreach emails, reads the inbox and Instagram, finds mentions and rising search terms, keeps the todo list | Morning Brief (one page), `scoreboard.json` |
| Weekly growth | Saturday | Finds the biggest thing holding sales back, measures how AI search engines answer your category questions, opens one PR against the shop, drafts creators and editors to approach, drafts a customer email | A PR, the Seeding Roster, `geo-history.json` |
| Design digest | every morning | What changed in brand, visual and product design in the last 24 hours | A message |
| AI news digest | every morning | What happened in AI and in your product category in the last 36 hours | A message |
| Weekly status | Friday | Summarises your own week from your chats and notes, ready to paste | A message |

The two shop agents are the point. The digests are optional.

## The rules that make this safe

These are written into every prompt. Keep them.

1. **The agent never spends money or speaks for you.** No refunds, no price
   or stock changes, no ad changes, no replies to customers, no posts, no
   likes, no follows. It sends only outreach emails you have marked `ready`.
2. **One page, not a chat.** The daily agent writes to one page. It messages
   you only for a short list of reasons (a dispute, a yes from a creator, a
   blocked step, a milestone). Otherwise silence.
3. **One open PR per repo.** The weekly agent adds commits to an existing open
   PR instead of opening another. You merge; it never does.
4. **Never enter a password.** If a site is logged out, skip the step and
   write it to the todo list.
5. **No fake anything.** No fake reviews, no posting as a customer, no hidden
   text for AI crawlers, no claims the product page doesn't already make.
6. **Measure before fixing.** The weekly agent names one bottleneck per brand
   with numbers, and the PR targets that bottleneck.

## Layout

```
prompts/
  daily-ops.md        the morning run
  weekly-growth.md    the Saturday run
  design-digest.md    optional
  ai-news-digest.md   optional
  weekly-status.md    optional
scripts/
  README.md           what brief.mjs, send.mjs and rows.mjs must do
  brief.mjs           read-only snapshot from Stripe, stock and your email provider
  send.mjs            sends the outreach emails marked ready
  rows.mjs            turns the snapshot plus extras into the page's rows
data/
  config.example.json your brands, rules and places, referenced by the prompts
  scoreboard.schema.json
  geo-history.schema.json
  extras.schema.json
```

## Setup

1. Copy `data/config.example.json` to `data/config.json` and fill in your
   brands: products, prices, delivery rules, promo codes, Christmas last-order
   dates, copy rules, creator conflicts. The prompts read facts from here, so
   the agent never guesses a price.
2. Implement the three scripts in `scripts/` against your own stack. The
   interfaces are small: `brief.mjs` prints a JSON snapshot, `send.mjs` sends a
   batch of emails and prints results, `rows.mjs` builds the page.
3. Make a page the agent can write to. I use a Claude artifact with two
   datasets, `brief` and `scoreboard`; a Notion page or a static JSON file
   behind a dashboard works too.
4. Make a roster the agent can read and update: a table of creators, editors
   and stockists with a status per brand (`new`, `draft`, `ready`, `sent`,
   `replied`, `yes`, `no`). You move drafts to `ready`; the agent sends them
   next morning.
5. Create the scheduled tasks. Paste each prompt, fill the `{{...}}` fields
   from your config, and give the task access to the tools it names (a shell
   on the machine that holds the scripts, a browser signed into your inboxes,
   read access to Stripe).

## How I use the page

Every morning the page shows: orders yesterday and the 7-day average against
the goal, the current milestone, cost per order per campaign, abandoned
checkouts and what shipping was charged, outreach counts per brand, replies
that came in, mentions on the web, 3–6 rising search terms with a one-line
idea each, and a todo list of decisions. I read it in two minutes. If a todo
needs a reply, I reply myself.

Every Saturday I get six lines: orders per brand against last week and the
goal, the bottleneck per brand, the PR link, how many AI-search answers named
the brand, how many drafts are waiting, and anything blocked. I review the PR
and the drafts over coffee.

## Why it's shaped like this

A one-person brand fails on attention, not on ideas. The job of these agents
is to take the recurring looking (sales, ads, inbox, mentions, search) off
your plate and leave you with decisions. The hard part was not the prompts;
it was deciding what the agent must never do, and getting it to stay quiet.

## License

MIT. The prompts and scripts are yours to adapt. The product facts in
`config.example.json` are examples only.
