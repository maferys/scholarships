# Scholarships

Free, bilingual (EN/ES) tools for US parents spending education scholarship money (ESAs and similar programs).
Independent project: not affiliated with any state, program administrator or spending platform.

Phase 1 is the **Scholarship Finder, Mode A**: pick a state and program, type what you want to buy, and get a cautious answer
(likely eligible / likely not eligible / depends / not verified) with the official source, page and last-verified date.

## How it works

```
data/categories.yaml      shared category list with EN/ES synonyms (drives the keyword matcher)
data/programs/*.yaml      one file per program: administrator, platform, status, official sources (with tier)
data/rules/*.yaml         one file per program: a rule per category (status, conditions, quote, page, dates)
schema/*.json             JSON Schemas for the files above
scripts/build-data.mjs    validates data/ and writes src/generated/data.json for the site
src/lib/eligibility.js    the only code that decides labels (see "Answer rules")
src/lib/match.js          maps what a parent types to a category
functions/api/*.js        Cloudflare Pages Functions: email signup, wrong-answer reports, anonymous usage events (D1)
```

### Answer rules

- **Likely eligible** only when the rule is `allowed`, cites a tier 1–3 source (statute/regulation, state agency, platform),
  is inside its effective dates, was verified in the last 120 days, and has no caps, vendor-approval need or source conflict.
- **Depends** for `conditional` rules, caps, approved-vendor requirements, and any rule with a `conflict_note`
  (the note is shown on the answer card in EN and ES).
- In a program marked `settling` or `litigated`, a rule whose `source` is tier 1 (statute or final regulation) keeps its
  label; a rule resting on a tier 2–4 source is capped at **depends**. The "rules recently changed" banner always shows.
  Paused programs answer **not verified**.
- **Not verified, check with your program** when there is no rule, the rule is stale or out of date range, or the source is untrusted.
- Sponsorship, affiliate and ownership flags are never passed to this logic.

## Reviewing rules (required before launch)

Every rule starts as `review_status: draft` and `es_reviewed: false`. **Production builds publish a rule only when it is
`reviewed` and `es_reviewed: true`**; CI fails if anything else reaches the site data (`scripts/check-published.mjs`).
Until then the live site shows "not verified":

1. Open the source link in the program file and go to the page in the rule's `locator`.
2. Confirm the `quote` is word for word and the English `conditions_text` says the same thing.
   Set `review_status: reviewed`, `verified_by: <your name>`, `last_verified: <today>`.
3. Check the Spanish text separately and set `es_reviewed: true`.

Rules with `quote: null` need a quote added during review. A `review_flag` (on a rule or a source) says what must be
checked first. A `conflict_note` needs an answer from the administrator.

## Develop

```sh
npm install
npm run dev            # includes draft rules
npm test               # data validation, eligibility logic, matcher cases (EN/ES)
npm run build          # production: reviewed rules only
npm run build:preview  # preview: drafts included
```

## Run the API functions locally

```sh
npm run build:preview
npx wrangler d1 migrations apply scholarships --local       # creates a local SQLite copy of the D1 schema
npx wrangler pages dev                                      # serves dist/ and functions/ on http://localhost:8788, using wrangler.toml's DB binding
# in another terminal:
curl -X POST localhost:8788/api/event -H 'content-type: text/plain' \
  -d '{"program":"az-esa","query":"Laptop me@x.com","label":"likely_eligible"}'
npx wrangler d1 execute scholarships --local --command "SELECT * FROM events"
```

## Privacy of stored data

- `events`: program id, search text (lowercased, emails and phone numbers removed, max 120 characters), result label,
  and the hour of the search. Nothing else from the request.
- `reports`: what the parent wrote, the answer it was about, the search text (cleaned the same way as events),
  and a contact email only if they chose to give one (stored as typed, not filtered).
- `subscribers`: email, language, optional state.
- No table stores IP addresses or user agents.
- The search box and the report message both say "Do not include names or personal details."

### Retention

- `events` and `reports` are deleted once they are older than `RETENTION_MONTHS` (12) in
  [`scripts/retention.mjs`](scripts/retention.mjs). Change the constant there to change the period.
- `.github/workflows/retention.yml` runs the cleanup every Monday (and on demand from the Actions tab). It needs the
  repository secrets `CLOUDFLARE_API_TOKEN` (with D1 edit permission) and `CLOUDFLARE_ACCOUNT_ID`; until they are
  set, it skips with a warning and deletes nothing.
- To run it by hand: `npx wrangler d1 execute scholarships --remote --command "$(node scripts/retention.mjs)"`
  (use `--local` for the local database).
- `subscribers` are kept until the person unsubscribes.

## Before the first email

Do not send any email to subscribers until every item is done:

- [ ] Every email has a working unsubscribe link, and unsubscribing deletes the row from `subscribers`.
- [ ] A sender address on the site's own domain is set up and can receive replies.
- [ ] Every email links to the published privacy policy page.

## Deploy (Cloudflare Pages)

1. Create a Pages project from this repo. Build command `npm run build`, output `dist`.
   Use `npm run build:preview` for preview deployments.
2. Create the D1 database (`npx wrangler d1 create scholarships`), put its id in `wrangler.toml`, and run
   `npx wrangler d1 migrations apply scholarships --remote`. Bind it to the Pages project as `DB`.
3. Optional: set `PUBLIC_CF_ANALYTICS_TOKEN` (Cloudflare Web Analytics, cookie-free) and `SITE_URL`.

## Keeping data fresh

`.github/workflows/source-check.yml` runs weekly, re-downloads every source and opens an issue when one changed
(compared with the `sha256` stored on the source). After re-verifying the affected rules, update the stored hash.
