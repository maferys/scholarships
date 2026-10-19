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
- **Depends** for `conditional` rules, caps, approved-vendor requirements, conflicting sources, and every `allowed` rule in a
  program marked `settling` or `litigated`.
- **Not verified, check with your program** when there is no rule, the rule is stale or out of date range, or the source is untrusted.
- Sponsorship, affiliate and ownership flags are never passed to this logic.

## Reviewing rules (required before launch)

Every rule starts as `review_status: draft`. **Production builds leave draft rules out**, so the live site shows
"not verified" until a person checks each rule:

1. Open the source link in the program file and go to the page in the rule's `locator`.
2. Confirm the `quote` is word for word and the `conditions_text` (EN and ES) says the same thing.
3. Change the rule to `review_status: reviewed`, `verified_by: <your name>`, `last_verified: <today>`.

Rules with `quote: null` need a quote added during review. Rules with a `conflict_note` need an answer from the administrator.

## Develop

```sh
npm install
npm run dev            # includes draft rules
npm test               # data validation, eligibility logic, matcher cases (EN/ES)
npm run build          # production: reviewed rules only
npm run build:preview  # preview: drafts included
```

## Deploy (Cloudflare Pages)

1. Create a Pages project from this repo. Build command `npm run build`, output `dist`.
   Use `npm run build:preview` for preview deployments.
2. Create the D1 database (`npx wrangler d1 create scholarships`), put its id in `wrangler.toml`, and run
   `npx wrangler d1 migrations apply scholarships --remote`. Bind it to the Pages project as `DB`.
3. Optional: set `PUBLIC_CF_ANALYTICS_TOKEN` (Cloudflare Web Analytics, cookie-free) and `SITE_URL`.

## Keeping data fresh

`.github/workflows/source-check.yml` runs weekly, re-downloads every source and opens an issue when one changed
(compared with the `sha256` stored on the source). After re-verifying the affected rules, update the stored hash.
