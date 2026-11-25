# Palettes

A palette gives an app its brand color. Import it after the theme and before the app's own styles:

```ts
import '@wells-nelson/displays/theme.css';
import '@wells-nelson/displays/palettes/green.css';
import '../app.css';
```

| Palette  | Accent | Neutrals                  |
| -------- | ------ | ------------------------- |
| `blue`   | blue   | blue-grey (the theme's)   |
| `green`  | green  | green-tinted              |
| `purple` | plum   | the theme's (blue-grey)   |

`blue` is the theme's default, so importing it is optional.

## The contract

Every palette lives in this folder, so every one is covered by the contrast test
(`src/tests/palettes.test.ts`). The token lists are exported as `PALETTE_ACCENT_TOKENS` and
`PALETTE_NEUTRAL_TOKENS`.

A palette sets, on `:root` in light mode and again inside `@media (prefers-color-scheme: dark)`:

- **Accent (required, both modes):** `--accent`, `--accent-strong` (hover), `--accent-text` (accent
  used as text on surfaces), `--accent-soft` (tinted background) and `--on-accent` (text and icons on a
  solid `--accent`).
- **Neutral tint (optional, all or none, both modes):** `--bg`, `--surface-2`, `--surface-hover`,
  `--text`, `--muted`, `--border` and `--border-strong`. Dark mode may also set `--surface`.

Nothing else: intent colors (`--danger`, `--warning`, `--success`), `--control-border`, the scales and
`--focus` (which follows `--accent`) come from the theme.

A palette that leaves out a dark token silently falls back to the theme's blue, so the test checks
both modes.

## Contrast

The test parses each palette over `theme.css` in both modes and requires (WCAG 2.2 AA):

| Pair                                                                    | Minimum |
| ----------------------------------------------------------------------- | ------- |
| `--text`, `--muted` on `--bg`, `--surface`, `--surface-2`                | 4.5     |
| `--accent-text` on `--surface`, `--bg`, `--accent-soft`                  | 4.5     |
| `--on-accent` on `--accent`; `--on-danger`, `--on-warning`, `--on-success` on their fill | 4.5 |
| `--danger`, `--warning`, `--success` on `--surface` and on their `-soft` | 4.5     |
| `--control-border`, `--accent` (focus ring) on `--surface`, `--bg`       | 3       |

## Adding a palette

1. Copy `purple.css` (accent only) or `green.css` (accent and tinted neutrals) to `<name>.css`.
2. Pick the accent: a mid-dark shade for light mode (white text on it), a lighter one for dark mode (dark
   text on it). `--accent-text` is usually a shade darker (light) or lighter (dark) than `--accent`.
3. Add the name to `PALETTES` in `src/lib/palettes.ts` and run `npm test -w src/npm/displays`. The test
   names any pair that falls short.
