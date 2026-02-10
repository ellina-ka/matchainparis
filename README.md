# Matcha in Paris 🍵

A lightweight static website that curates matcha cafés in Paris with personal ratings, tasting notes, and an interactive map.

**Live site:** [matchainparis.com](https://matchainparis.com)

---

## What this project is

`matchainparis` is a no-build, static front-end project made of HTML/CSS/JavaScript files.

It includes:
- An **About** page (`index.html`)
- A **Spots** page (`spots.html`) with:
  - searchable/filterable café list
  - Leaflet map markers
  - Google Maps quick links
  - bilingual UI (EN/FR)
- A **Contact** page (`suggest.html`) posting to Formspree

All café content is stored in `data.json` and loaded client-side by `script.js`.

---

## Tech stack

- **HTML5** (multi-page static site)
- **CSS3** (`styles.css` + small page-local styles)
- **Vanilla JavaScript** (`script.js` + inline page scripts)
- **Leaflet** (map rendering on Spots page via CDN)
- **OpenStreetMap tiles** (through Leaflet)
- **Formspree** (contact form backend)
- **Google Translate widget** (embedded on `spots.html`)

No bundler, framework, or package manager is required.

---

## Project structure

```text
.
├── index.html                 # About page
├── spots.html                 # Spots list + map page
├── suggest.html               # Contact/submit form page
├── script.js                  # Spots page behavior (filters, map, i18n)
├── styles.css                 # Shared styling
├── data.json                  # Café dataset (26 spots)
├── CNAME                      # Custom domain for static hosting
├── assets/
│   ├── logo.png
│   ├── matchabanner.png
│   └── favicon/...
└── README.md
```

---

## Data model (`data.json`)

Each spot object contains:

- `name` (string)
- `address` (string)
- `lat` (number)
- `lng` (number)
- `my_rating` (number)
- `price` (string, e.g. `€€`)
- `tags` (array of string)
- `notes` (English string)
- `notes_fr` (French string)

Supported tags used by UI filters:
- `work-friendly`
- `no-laptops`
- `to-go`
- `ceremonial`
- `flavoured`

---

## Key features

### 1) Spots discovery
- Free-text search across names, addresses, notes, and tags
- Arrondissement filter
- Hide-unrated toggle
- Tag filters (AND logic)
- “Top picks” filter (rating >= 4.6)
- Applied-filter chips with one-click removal

### 2) Interactive map
- One marker per visible result
- Map bounds auto-fit current filtered results
- Popup shows name, address, and rating
- “Jump to map” shortcut on mobile

### 3) Localization
- EN/FR language toggles on all pages
- Language preference persisted in `localStorage` (`lang` key)
- On Spots page:
  - UI strings are localized
  - notes switch between `notes` and `notes_fr`

### 4) Contact workflow
- Multi-topic form:
  - submit a spot
  - bug/improvement
  - business collaboration
- Conditional validation (email required for collab/newsletter)
- AJAX submit to Formspree (no page redirect)
- In-page success state after submit

---

## Run locally

Because the app fetches `data.json`, serve it over HTTP instead of opening files directly.

### Option A: Python

```bash
python3 -m http.server 8000
```

Then open: `http://localhost:8000`

### Option B: any static server
Use your preferred static server (e.g. `npx serve`, Caddy, nginx, etc.).

---

## Deployment

This repository is configured for static hosting. `CNAME` indicates production domain usage:

- `matchainparis.com`

It can be hosted on GitHub Pages, Netlify, Cloudflare Pages, or any static host.

---

## Notes and caveats

- The map uses external CDNs (Leaflet + OSM tiles), so internet access is required for map tiles/scripts.
- `spots.html` includes a Google Translate widget script from `translate.google.com`.
- Form submissions depend on the configured Formspree endpoint in `suggest.html`.
- Data quality/content consistency is maintained manually in `data.json`.

---

## Author

Built with ❤️ in Paris, by Ellina K-A.
