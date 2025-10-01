Recipe Card PWA — Meal Delivery Kitchen

What I added
- Basic PWA scaffold: `index.html`, `styles.css`, `main.js`, `idb.js`, `sw.js`, and `manifest.json`.
- CSV upload using Papa Parse. Parsed rows are grouped by `DISH` and `COMPONENT`, converted into a dishes structure and saved to IndexedDB.
- Simple UI to list dishes, open recipe cards, view ingredients grouped by component, and edit/save a cooking method into IndexedDB.
- Service worker caches static assets for offline use.

How to run locally
1. Serve the folder over HTTP (service workers require HTTPS or localhost). Example using Python 3:

```bash
cd /path/to/RecipeCard
python3 -m http.server 8000
# then open http://localhost:8000
```

2. Upload a CSV exported from Google Sheets (header row expected as described in the project brief).

Notes and next steps
- Add icons (`icon-192.png`, `icon-512.png`) for full A2HS support.
- Improve CSV column normalization and robust error handling for malformed CSVs.
- Add a dedicated print stylesheet or "Print" button that opens the recipe card in a print-friendly view.
- Add tests and more accessibility improvements.
