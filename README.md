# 2026 Candy Haul Forecast

A single-page, FiveThirtyEight-style breakdown of our Halloween 2026 trick-or-treat haul.
Static HTML + D3, no build step.

**Live site:** https://kevconklin.github.io/trick-or-treat/

Deployed with GitHub Pages from the `main` branch root. Every push to `main` republishes within about a minute.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page structure and copy |
| `styles.css` | FiveThirtyEight-2016-flavored styling |
| `data.js` | The haul data (generated from `trick-or-treat-data.xlsx`) plus categories, calorie estimates and photo credits |
| `charts.js` | D3 chart builders (share bar, ranked bars, diverging bars, category stacks, runway line chart, data table) |
| `app.js` | Computes the stats, fills the page, wires the controls |
| `images/` | Candy photos from Wikipedia / Wikimedia Commons (credits listed on the page) |
| `trick-or-treat-data.xlsx` | Source spreadsheet (sheets: `Data`, `Subjects`) |

## Preview locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy to GitHub Pages

Already set up: repository `kevconklin/trick-or-treat`, Pages source = `main` / `/ (root)`.
To publish changes:

```bash
git add -A
git commit -m "feat: describe the change"
git push
```

## Updating the data

Edit the counts in `data.js` (the `candies` array). Every number on the page is computed from that array at load time, so totals, shares, rankings and the forecast update automatically. The prose in `index.html` has a few hand-written claims (for example "a little more than half chocolate") that you may want to re-check after large changes.

## Notes

- Calorie figures are rough fun-size estimates for comparison only.
- Photos are public-domain or Creative Commons from Wikimedia Commons; per-image credits are in the "Photo credits" section of the page and in `data.js`.
