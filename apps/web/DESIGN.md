# DESIGN.md — Team Elite Portal

Durable visual system. Operate mode (task-completion app UI). Chosen world: **Ledger**.

## Direction contract

**THESIS** — The portal that replaced a leaky spreadsheet should feel like an
*intentional records book*, not another rounded SaaS dashboard. It refuses the
generic "cards + soft shadows + blue accent" admin template. Structure is the
decoration: hairline rules, ruled paper, monospace figures, numbered entries.

**OWN-WORLD** — Warm paper ground (cream in light, warm ink-black in dark).
Ink foreground. One ledger-red spark (`--brand`) for active state, key rules,
links-on-emphasis. Figures, IDs, dates, counts, codes are set in monospace with
tabular numerals. Borders are 1px hairlines in a warm tone; primary structure
uses ink rules. Corners are crisp (2–6px, never pill-soft except avatars).
No glass, no blur, no gradient fills, no colored halos. Titles are heavy tight
grotesque, not serif — this deliberately breaks the cream+serif AI-default.

**STORY** — A staff member opens the book, reads the running totals across the
top, scans numbered candidate/application rows, and acts (add, assign, edit).
Candidates see only their own sanitized ledger of applications, read-only.

**FIRST VIEWPORT** — Ledger header (wordmark + ink mark, mono section nav).
Page title block: mono eyebrow (role), heavy title, right-aligned mono meta
(period / updated). Running-total figures below, then the ruled data table.
Primary action sits top-right of the table caption as an ink button.

**FORM** — Ledger / account-book. User-pinned direction (chosen from rendered
comps), so no concept roll. Position: pinned.

## Tokens (see apps/web/src/styles.css `:root` + `.dark`)

- Type: `--font-sans` IBM Plex Sans (body/UI), `--font-mono` IBM Plex Mono
  (figures/labels/codes/dates), `--font-display` = sans, weight 800, tight.
- Color roles: `--background` paper, `--surface`/`--surface-elevated` stock,
  `--foreground` ink, `--muted`/`--muted-foreground`, `--border` warm hairline,
  `--accent` ink (primary/emphasis/active) + `--accent-foreground`,
  `--brand` ledger red (spark), `--ring` red focus, `--success` green ink,
  `--danger` red ink.
- Radius scale is overridden small (`--radius-*` 2–8px). `rounded-full` kept
  only for avatars.

## Rules

- Figures (counts, totals, IDs, dates, page numbers) → `font-mono`, tabular.
- Eyebrows/labels → `.eyebrow` (mono, uppercase, tracked, muted).
- Tables: hairline rows, mono meta columns, numbered entries where a stable
  record number helps scanning. Header row = mono uppercase micro-caps.
- One accent per view: ink for the primary action, red spark used sparingly
  (active nav underline, key rule, danger). Never red-fill large regions.
- No backdrop-blur, no gradient text, no soft-shadow rounded-rect standing in
  for content. Depth is a real offset+blur shadow, used sparingly.
- Monospace is for data/measurement here, not costume — keep it on figures and
  identifiers, not on body prose.
- Light vs dark: both are legitimate ledger stock; theme toggle persists.
