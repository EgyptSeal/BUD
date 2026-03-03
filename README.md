# PFIS — Personal Finance Intelligence System

High-tech web-based budget & savings optimization platform. Pure HTML + CSS + JavaScript (no backend). Data stored in browser **localStorage** with export/import to CSV/JSON.

## Features

- **Overview panel**: Total income, expenses, net savings, savings rate %, financial health indicator (Green / Yellow / Red) and 0–100 score
- **Monthly expense input**: Category, subcategory, planned vs actual, auto-calculated difference; add/edit/delete rows; month selector (Jan–Dec); copy previous month as template
- **Charts** (Chart.js): Pie (category %), bar (planned vs actual), line (monthly savings trend)
- **AI insights**: Top 3 expense categories, largest overbudget, savings rate tips, category % vs income, “what if” reduction hints, month-over-month growth detection, expense clustering
- **Background data layer**: All data in structured JSON in localStorage; export to CSV/JSON; import from CSV or JSON
- **AI chat assistant**: Ask for forecast, top categories, savings rate, health score; smart auto-category suggestions (e.g. “suggest category for fuel” → Transportation)
- **Optional**: Dark/light theme toggle, PDF-style report (print), financial health score, savings goal progress, emergency fund progress, predictive savings forecast (3 months)

## Tech stack

- **HTML5** — semantic layout
- **CSS3** — dark navy theme, cyan accents, glassmorphism panels, grid blueprint background, hover glow, animations
- **Vanilla JavaScript** — no frameworks
- **Chart.js** (CDN) — pie, bar, line charts

## Project structure

```
PFIS/
├── index.html    # Single-page dashboard
├── style.css     # Global and component styles
├── app.js        # UI logic, AI insights, chat, export/import
├── charts.js     # Chart.js wrappers (pie, bar, line)
├── dataEngine.js # Data layer: localStorage, calculations, CSV/JSON
└── README.md     # This file
```

## How to run

1. Open `index.html` in a modern browser (Chrome, Firefox, Edge, Safari), or serve the folder with any static server (e.g. `npx serve PFIS`).
2. Enter **Monthly Income** and add expense rows (category, subcategory, planned, actual).
3. Use **Year/Month** to switch months; **Copy previous month** to clone last month’s data.
4. **Export CSV/JSON** to backup; **Import CSV/JSON** to restore or migrate data.
5. **Import Excel**: Click **Import Excel** and choose your `.xlsx` budget file (e.g. *Hossam BUD 2026.xlsx*). The app detects columns such as **Category**, **Subcategory**, **Planned** (or Budget), **Actual** (or Spent), **Income**, **Month**, **Year**. It supports one sheet with Month/Year columns, or multiple sheets named by month (Jan, Feb, 2026-01, etc.).

## Data format (background database)

Stored under `localStorage` key `pfis_database`:

```json
{
  "2026-01": {
    "income": 50000,
    "expenses": [
      { "category": "Housing", "subcategory": "Rent", "planned": 10000, "actual": 12000 },
      { "category": "Food", "subcategory": "Groceries", "planned": 5000, "actual": 6500 }
    ]
  }
}
```

- **Export JSON**: full database as above.
- **Export CSV**: rows with columns `YearMonth, Income, Category, Subcategory, Planned, Actual`.

## Formulas

- **Net savings** = Income − Total actual expenses  
- **Savings rate %** = (Net savings / Income) × 100  
- **Difference** (per row) = Actual − Planned  
- **Category %** = (Category actual / Total actual expenses) × 100  

## Browser support

Any browser that supports ES5+, `localStorage`, and Chart.js (e.g. Chrome 60+, Firefox 55+, Edge 79+, Safari 12+).

## License

Use and modify freely for personal or commercial projects.
