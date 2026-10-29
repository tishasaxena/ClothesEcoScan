# 🌍 EcoScan: Clothing Carbon Footprint Scanner

EcoScan helps people understand the environmental impact of their clothes. Photograph a garment (and, optionally, its care label) and EcoScan identifies each item, estimates its carbon footprint, grades it from **A to E**, awards **eco-reward points** for lower-impact choices, and shows **offers** you can redeem with those points.

<p align="center">
  <img src="docs/screenshots/mobile-scan.jpg" width="200" alt="Scan screen">
  <img src="docs/screenshots/mobile-result.jpg" width="200" alt="Result with grade and footprint">
  <img src="docs/screenshots/mobile-rewards.jpg" width="200" alt="Rewards and offers">
  <img src="docs/screenshots/mobile-wardrobe.jpg" width="200" alt="Wardrobe, stats and badges">
</p>
<p align="center">
  <img src="docs/screenshots/desktop-result.jpg" width="880" alt="Desktop result layout">
</p>

---

## 📑 Table of Contents

1. [Overview](#-overview)
2. [Features](#-features)
3. [Tech Stack](#-tech-stack)
4. [Requirements Checklist](#-requirements-checklist)
5. [Setup Instructions](#-setup-instructions)
6. [Run Instructions](#%EF%B8%8F-run-instructions)
7. [Testing](#-testing)
8. [API Reference](#-api-reference)
9. [Carbon Score Assumptions](#-carbon-score-assumptions)
10. [Eco-Reward Points](#-eco-reward-points)
11. [Code Structure](#-code-structure)
12. [Design Decisions](#-design-decisions)
13. [Enhancement Proposals](#-enhancement-proposals)
14. [Deployment](#-deployment)
15. [Troubleshooting](#-troubleshooting)
16. [Credits](#-credits)

---

## 📜 Overview

The user story from the brief, end to end:

1. **Upload or snap a photo:** upload an image file, drag one in, or take one with the camera 📸.
2. **Identify the clothing:** a vision model (Gemini, Claude or GPT-4o, or an offline mock) finds every clothing item in the photo.
3. **Calculate each item's footprint:** from its type, materials, weight and condition.
4. **Show the total carbon score and eco-reward points:** points are earned for the CO₂e saved compared with a typical new item.
5. **Show offers to redeem:** what the user can afford now, and how many points they need for the next one.

---

## ✨ Features

**Scanning**
- **Ways to add a photo:** take a photo, upload, drag and drop, or tap one of six real sample photos.
- **Phone camera:** on phones, the raised orange **Scan** button opens the camera directly.
- **Care-label photo (optional):** add a second photo of the care label, and the AI reads the exact fibre percentages from it.
- **Several items per photo:** each one is scored separately.

**Results**
- **Grade and footprint:** an A–E grade, kg CO₂e, and a comparison bar against a typical new item.
- **Breakdown:** emissions from fibres, manufacturing and transport, plus the saving from buying second-hand.
- **Everyday comparisons:** km driven, phone charges, tree-days.
- **Greener options:** what the item would emit second-hand or in a better fibre, and the points that choice earns.
- **Wear planner:** a slider showing CO₂e per wear.
- **Edit details:** correct the type, condition or materials and re-score instantly.

**Rewards and wardrobe**
- **Claim points:** once per scan; the same photo can't earn twice.
- **Wallet:** balance, CO₂e saved, and progress to the next reward ("6 pts to £5 off second-hand").
- **Offers:** redeem for a voucher code, with offers recommended based on what you scanned.
- **Wardrobe:** totals, how your items spread across grades A–E, scan history with photo thumbnails, and six badges with progress (earned badges are gold).

**Experience**
- **Interactive cards:** every card opens a detail sheet (badges, rewards, comparisons, wallet, wardrobe stats, full-screen photo).
- **Back navigation:** the phone's back gesture, the browser's Back button and an on-screen **Back** button return to the previous screen instead of leaving the app.
- **Design:** beige and brown theme with a sage-green points accent, light and dark mode, animations, and layouts from 320 px phones to wide desktops.
- **Offline fallback:** if the backend can't be reached, the app keeps working in the browser.

---

## 🔧 Tech Stack

TypeScript is used throughout.

### Frontend

| Technology | Used for |
| --- | --- |
| **React 19** | All screens, sheets and interactions |
| **TypeScript** | Type-safe UI code, with types that match the API's data |
| **Vite** | Dev server with hot reload, production build, and passing `/api` requests to the backend during development |
| **Plain CSS** (no UI library) | Design tokens for light and dark mode, responsive layouts, animations (switched off under `prefers-reduced-motion`) |
| **Google Fonts** | Bricolage Grotesque (headings), Instrument Sans (body), JetBrains Mono (labels) |
| **Browser features** (no extra libraries) | Camera (`getUserMedia` and the photo picker), shrinking photos before upload, thumbnails, `localStorage`, back navigation using the page address, copying to the clipboard |

### Backend

| Technology | Used for |
| --- | --- |
| **Node.js + Express 5** | REST API: image analysis, scoring, offers, rewards |
| **Multer** | Image uploads (garment and care label), image-only, 10 MB limit |
| **Zod** | Checking every request, and double-checking what the AI model returns |
| **dotenv** | API keys and settings from `backend/.env` |
| **In-memory store** | Users, scans and rewards, with no database as the brief asks. Optional saving to a JSON file. |
| **Node `crypto`** | Image fingerprints (SHA-256) for duplicate detection, IDs, and voucher codes |

### Image recognition

| Technology | Used for |
| --- | --- |
| **Claude Opus 5.5** (`@anthropic-ai/sdk`) | Main recognizer: garment and care-label reading, with results in a fixed format and an automatic retry on another model if the request is refused |
| **OpenAI GPT-4o** (vision) | Alternative recognizer when an OpenAI key is set |
| **Google Gemini** (`@google/genai`, free tier) | **Free** recognizer: garment and care-label reading with a JSON-schema response; default model `gemini-flash-lite-latest`, with `gemini-flash-latest` as a backup when busy |
| **Mock recognizer** | Works with no API key and gives the same answer for the same photo, for demos and tests |

### Testing and tooling

| Technology | Used for |
| --- | --- |
| **Vitest** | Unit tests: 34 backend, 8 frontend |
| **Supertest** | API endpoint and error-case tests |
| **npm workspaces + concurrently** | One `npm install`; `npm run dev` starts both frontend and backend |

---

## ✅ Requirements Checklist

| Requirement from the brief | How EcoScan meets it |
| --- | --- |
| Upload a picture **or take one with the camera** | *Take photo*, *Upload*, drag and drop, samples; the phone **Scan** button opens the camera |
| App identifies the clothing items in the image | `POST /api/scans`: Gemini, Claude, GPT-4o or mock; several items per photo |
| Carbon footprint for each item | `backend/src/services/carbon.ts` + data in `backend/src/data/` |
| Total carbon score and eco-reward points | `totalKgCO2e`, `totalSavedKgCO2e`, `totalPoints` on every scan; shown on the result screen |
| Offers based on the user's points | `GET /api/offers` (`affordable`, `pointsNeeded`, `?affordable=true`); Rewards screen |
| **Image Analysis Endpoint** | `POST /api/scans` |
| **Eco-Score Calculation** | `POST /api/score` |
| **Offers Retrieval** | `GET /api/offers` and `POST /api/offers/:id/redeem` |
| Carbon assumptions in an in-memory dictionary | `CATEGORY_PROFILES`, `MATERIALS` (see [assumptions](#-carbon-score-assumptions)) |
| No database; in-memory storage | `backend/src/services/store.ts` |
| Basic unit tests | 42 tests (see [Testing](#-testing)) |
| Error handling (e.g. invalid image upload) | 415 non-image, 400 missing or oversized image, 400 bad JSON or invalid items, AI failure → mock fallback with a warning |
| README: setup, assumptions, run and test, deployment, enhancements | This document |

---

## 🚀 Setup Instructions

### Prerequisites

| Requirement | Notes |
| --- | --- |
| **Node.js 20.19+** | **22 LTS recommended** (`.nvmrc` included). Download from https://nodejs.org. Check with `node -v`. |
| **npm 10+** | Comes with Node. Check with `npm -v`. |
| API key *(optional)* | For real image recognition. **Free:** a Google **Gemini** key from https://aistudio.google.com/apikey. **Paid:** **Anthropic** (https://console.anthropic.com) or **OpenAI** (https://platform.openai.com). Without a key, EcoScan runs in demo mode. |

### Step 1: Get the code

```bash
# From the zip
unzip ecoscan.zip          # Windows: right-click → Extract All
cd ecoscan

# Or from GitHub
git clone https://github.com/<your-username>/ecoscan.git
cd ecoscan
```

### Step 2: Install dependencies

One command installs the frontend and the backend (npm workspaces):

```bash
npm install
```

### Step 3: Configure environment variables (optional)

```bash
# macOS / Linux
cp backend/.env.example backend/.env

# Windows (Command Prompt)
copy backend\.env.example backend\.env
```

Then edit `backend/.env`:

| Variable | Default | Description |
| --- | --- | --- |
| `GEMINI_API_KEY` | *(empty)* | Turns on **Gemini vision (free tier)**. |
| `GEMINI_MODEL` | `gemini-flash-lite-latest` | First Gemini model to try; if it is overloaded, the app tries `gemini-flash-latest` next. |
| `ANTHROPIC_API_KEY` | *(empty)* | Turns on Claude vision (paid). |
| `ANTHROPIC_MODEL` | `claude-opus-5-5` | Claude model to use. |
| `OPENAI_API_KEY` | *(empty)* | Turns on GPT-4o vision (paid). |
| `OPENAI_MODEL` | `gpt-4o` | OpenAI model to use. |
| `RECOGNIZER` | `auto` | `auto` picks Claude → OpenAI → Gemini → mock by which key is set. Force one with `claude`, `openai`, `gemini` or `mock`. |
| `PORT` | `3001` | API port. |
| `DB_PATH` | *(empty)* | Empty = in-memory (resets on restart). Set e.g. `./data/db.json` to keep data. |

**Free real recognition with Gemini:**
1. Go to **https://aistudio.google.com/apikey**, sign in with a Google account, and click **Create API key** (free tier, no card needed).
2. Paste it into `backend/.env` as `GEMINI_API_KEY=your-key`.
3. Restart `npm run dev`. The result screen will say "identified by Gemini vision".

> No `.env` file? That's fine: the app starts with the mock recognizer and in-memory storage.
>
> 🔒 **Keep keys private.** `backend/.env` is ignored by Git, so it's never committed. Don't paste keys into chats, screenshots or code; if a key leaks, delete it and create a new one.

### Step 4: Start the application

```bash
npm run dev
```

The terminal shows both servers starting. Open **http://localhost:5173**.

---

## ▶️ Run Instructions

### Development mode (recommended)

```bash
npm run dev
```

| What | URL |
| --- | --- |
| **EcoScan app (open this)** | **http://localhost:5173** |
| API health check | http://localhost:3001/api/health |

The app calls the API through Vite's proxy, so you only need the 5173 address. Code changes reload automatically.

### Production mode (single server)

```bash
npm run build
npm start
```

Open **http://localhost:3001**. One Express server serves both the built app and the API.

### Opening it on your phone

1. Run `npm run dev` on your computer.
2. Connect your phone to the **same Wi-Fi** network.
3. Open the **Network** address Vite prints, e.g. `http://192.168.1.5:5173`. Don't use `localhost`, which on a phone means the phone itself.
4. If Windows asks, allow Node.js through the firewall.

The phone camera opens through **Scan** or **Take photo**. A live in-page camera preview needs HTTPS (see [Deployment](#-deployment)).

### A quick tour

1. Tap **Get started** on the welcome screen.
2. Tap a **sample photo**, or use **Take photo** or **Upload**.
3. *(Optional)* Add a **care label** photo, then tap **Analyse footprint**.
4. Explore the grade, the breakdown, **Greener options** and the wear planner. Tap any card for details, and use **Edit details** to correct the item.
5. **Claim points**, then go to **Rewards** to redeem an offer, and to **Wardrobe** for stats and badges. Use **Back** or your phone's back gesture to return.

### Modes at a glance

| Mode | When | Image recognition | Data |
| --- | --- | --- | --- |
| **AI mode** | API key set in `backend/.env` | Gemini (free), Claude or GPT-4o | Server memory |
| **Demo mode** | No API key | Mock: matches photos to sample garments (a word like `jeans` in the filename steers it) | Server memory |
| **Offline mode** | Backend not reachable | Mock, in the browser | This device only (banner shown) |

---

## 🧪 Testing

```bash
npm test                  # all 42 tests (backend, then frontend)
npm test -w backend       # 34 backend tests
npm test -w frontend      # 8 frontend tests
npm run build             # also type-checks the whole project
```

| Test file | What it covers |
| --- | --- |
| `backend/test/carbon.test.ts` | Material aliases and normalisation, baseline grading, lower-impact fibres, second-hand discount and bonus, high-impact fibres graded E, custom weights, tips, greener alternatives |
| `backend/test/api.test.ts` | Full scan → edit → claim → redeem flow, duplicate photos earning nothing, per-user isolation, `POST /api/score`, offers by points, and errors (non-image, missing image, image over 10 MB, malformed JSON, invalid items, unknown offer, too few points) |
| `backend/test/recognizer.test.ts` | Exact Claude request (images, output format, care-label second image) against a local stub server, refusal handling, unsupported image types, provider selection |
| `backend/test/gemini.test.ts` | Exact Gemini request (inline images, JSON schema, system prompt, care label) against a local stub server, empty results, blocked responses, switching models when one is overloaded, unsupported image types |
| `frontend/src/lib/__tests__/*` | Badge progress, next-reward progress, screen addresses (routes), recognizer labels, sample-photo helper |

---

## 🔌 API Reference

Base path: `/api`. Endpoints that use a person's data need an **`X-User-Id`** header: an anonymous id (8–64 letters, digits, `-`, `_`) that the app creates once per device.

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/scans` | **Image analysis.** Multipart `image` (required) + `label` (optional care-label photo). Returns identified items with carbon scores, totals, points and recommended offers. |
| `POST` | `/score` | **Eco-score calculation.** JSON items in → carbon scores and points out. No image, nothing stored. |
| `GET` | `/offers` | **Offers retrieval.** With `X-User-Id`, adds `affordable` and `pointsNeeded`; `?affordable=true` returns only redeemable offers. |
| `POST` | `/offers/:id/redeem` | Spend points; returns a voucher code. |
| `GET` | `/scans/:id` | Get one of your scans. |
| `PUT` | `/scans/:id/items` | Correct items (type, condition, materials) and re-score. |
| `POST` | `/scans/:id/claim` | Credit a scan's points (once only). |
| `GET` | `/me` | Points, lifetime stats, scan history, vouchers. |
| `GET` | `/reference` | Categories and materials (for the edit form). |
| `GET` | `/health` | Server status and active recognizer. |

### Examples

```bash
# 1. Image analysis (garment + optional care label)
curl -X POST http://localhost:3001/api/scans \
  -H "X-User-Id: demo-user-123" \
  -F "image=@jeans.jpg" -F "label=@care-label.jpg"

# 2. Eco-score calculation (materials optional: the typical mix is assumed)
curl -X POST http://localhost:3001/api/score \
  -H "Content-Type: application/json" \
  -d '{"items":[{"category":"t-shirt"},
               {"category":"jeans","condition":"second-hand"},
               {"category":"shirt","materials":[{"material":"linen","percent":100}]}]}'

# 3. Offers the user can redeem now
curl "http://localhost:3001/api/offers?affordable=true" -H "X-User-Id: demo-user-123"
```

### Errors

All errors are JSON: `{ "error": "message", "details"?: [...] }`.

| Status | When |
| --- | --- |
| `400` | Missing image, image over 10 MB, malformed JSON, invalid item data, not enough points |
| `401` | `X-User-Id` missing or invalid where it's required |
| `404` | Unknown scan or offer |
| `409` | Scan already claimed |
| `415` | Uploaded file is not an image |

---

## 🌱 Carbon Score Assumptions

### Formula

Implemented in `backend/src/services/carbon.ts`:

```
footprint = weight × Σ (material share × fibre factor)   ← fibre production
          + weight × manufacturing factor               ← spinning, weaving, dyeing, cut & sew
                                                           (13 kg CO₂e/kg; denim 15; shoes 10)
          + 0.4 kg CO₂e                                  ← transport & retail

second-hand: only 10% of production is counted (reuse avoids ~90%), plus transport
```

| Term | Meaning |
| --- | --- |
| **Baseline** | The same formula for a *typical new* item of that type and weight |
| **CO₂e saved** | `baseline − footprint` (never below 0) |
| **Grade** | `footprint ÷ baseline`: **A** ≤ 0.5 · **B** ≤ 0.8 · **C** ≤ 1.05 · **D** ≤ 1.4 · **E** > 1.4 |

### Per-item assumptions (in-memory dictionary)

`CATEGORY_PROFILES` in `backend/src/data/categories.ts`. These values are generated from the code:

| 👕 Item | Typical weight | Typical materials (used when unknown) | 🌍 New (kg CO₂e) | ♻️ Second-hand (kg CO₂e) |
| --- | --- | --- | --- | --- |
| T-shirt | 180 g | 100% cotton | 3.8 | 0.7 |
| Shirt | 250 g | 100% cotton | 5.1 | 0.9 |
| Sweater | 450 g | 50% acrylic, 30% wool, 20% polyester | 11.3 | 1.5 |
| Hoodie | 600 g | 80% cotton, 20% polyester | 11.7 | 1.5 |
| Jeans | 650 g | 98% cotton, 2% elastane | 14.0 | 1.8 |
| Trousers | 500 g | 65% polyester, 33% viscose, 2% elastane | 9.4 | 1.3 |
| Shorts | 300 g | 100% cotton | 6.1 | 1.0 |
| Dress | 350 g | 100% polyester | 6.9 | 1.1 |
| Skirt | 300 g | 100% polyester | 6.0 | 0.9 |
| Jacket | 900 g | 85% polyester, 15% nylon | 17.3 | 2.1 |
| Coat | 1400 g | 50% wool, 50% polyester | 38.5 | 4.2 |
| Activewear | 250 g | 85% polyester, 15% elastane | 5.2 | 0.9 |
| Shoes | 900 g | 30% leather, 30% synthetic leather, 40% rubber | 20.5 | 2.4 |
| Other clothing | 400 g | 100% cotton | 8.0 | 1.2 |

### Fibre emission factors (kg CO₂e per kg of fibre)

`MATERIALS` in `backend/src/data/materials.ts`:

| Fibre | Factor | Fibre | Factor | Fibre | Factor |
| --- | --- | --- | --- | --- | --- |
| Cotton | 5.9 | Nylon | 7.3 | Viscose | 4.0 |
| Organic cotton | 3.8 | Recycled nylon | 3.5 | Modal | 4.1 |
| Recycled cotton | 1.6 | Acrylic | 6.4 | Lyocell (Tencel) | 2.4 |
| Polyester | 5.5 | Elastane | 9.0 | Linen | 1.7 |
| Recycled polyester | 3.2 | Wool | 23.0 | Hemp | 1.6 |
| Leather | 30.0 | Recycled wool | 2.0 | Silk | 25.0 |
| Synthetic leather | 7.0 | Cashmere | 38.0 | Down | 10.0 |
| Rubber | 3.0 | Other / unknown | 6.0 | | |

Material names from the AI model are normalised through aliases (*spandex/lycra → elastane, Tencel → lyocell, rPET → recycled polyester, denim → cotton…*) and rescaled to 100%.

### Sources and limitations

- **Sources:** rounded averages from public lifecycle data: Textile Exchange *Material Change Insights*, Higg MSI summaries, WRAP Textiles Tracker, Quantis *Measuring Fashion* (2018).
- **Purpose:** good for **comparing choices**, not for certifying a specific product.
- **Not yet included:** use phase (washing, drying), end of life, country-specific energy, dyeing method (see [Enhancement Proposals](#-enhancement-proposals)).

### Updating the data

All assumptions live in plain data files (`categories.ts`, `materials.ts`, `offers.ts`), separate from the logic. Numbers can change without touching code, and the dictionaries can later be swapped for a database or an external data provider.

---

## 🏅 Eco-Reward Points

Points reward **savings**, not buying more:

| Rule | Points |
| --- | --- |
| Per kg CO₂e saved vs. a typical new item | **10** |
| Second-hand item | **+20** |
| Lower-impact fibres (organic, recycled, linen, hemp, lyocell) | **up to +10**, by share |
| Every scan | **+5** |

- **Examples:** a typical new cotton T-shirt earns only the 5-point scan bonus; a second-hand pair of jeans earns about **143 points**.
- **Offers:** six partner offers from 100 to 400 points. Partner names are fictional for the demo.
- **Anti-gaming:** each scan can be claimed once, the same photo can't earn twice (SHA-256 fingerprint), and edits lock after claiming.

---

## 🗂 Code Structure

```
ecoscan/
├── package.json                 # npm workspaces + root scripts: dev, build, start, test
├── .nvmrc                       # Node 22
├── docs/screenshots/            # README images
├── backend/
│   ├── .env.example             # environment variables template
│   ├── src/
│   │   ├── server.ts            # entry point: env, recognizer and storage selection
│   │   ├── app.ts               # Express routes, validation, error handling
│   │   ├── types.ts             # shared domain types
│   │   ├── data/                # in-memory dictionaries
│   │   │   ├── categories.ts    #   per-item weight, typical materials, manufacturing factor
│   │   │   ├── materials.ts     #   fibre emission factors + aliases
│   │   │   ├── offers.ts        #   redeemable offers
│   │   │   └── mockCatalog.ts   #   sample garments for the mock recognizer
│   │   └── services/
│   │       ├── carbon.ts        # footprint, baseline, grade, points, tips, alternatives
│   │       ├── scans.ts         # scan totals, offer recommendations
│   │       ├── recognition.ts   # shared AI prompt + response validation
│   │       ├── claudeRecognizer.ts  # Claude vision
│   │       ├── geminiRecognizer.ts  # Gemini vision (free tier, model fallback)
│   │       ├── recognizer.ts    # OpenAI + mock recognizers, provider selection
│   │       └── store.ts         # in-memory store (optional JSON persistence)
│   └── test/                    # Vitest + Supertest
└── frontend/
    ├── index.html
    ├── vite.config.ts           # dev proxy + browser-only demo build
    ├── scripts/inline-demo.mjs  # bundles the demo into one HTML file
    └── src/
        ├── App.tsx              # app shell, navigation, reward sheet
        ├── index.css            # design tokens (light/dark), layout, animations
        ├── components/          # Scan, Result, ItemCard, Rewards, Wardrobe, sheets, camera…
        ├── lib/                 # API client, offline fallback, router, badges, rewards, helpers
        └── assets/samples/      # public-domain sample photos
```

---

## 🧭 Design Decisions

| Decision | Why |
| --- | --- |
| **Score materials, not just item type** | A wool sweater (16.6 kg CO₂e) has more than twice the footprint of a lyocell one (7.3 kg). The per-item table is the baseline and the fallback when materials are unknown. |
| **Optional care-label photo** | Guessing fibres from texture is the weakest link; the label gives exact percentages. |
| **Editable results** | Users can correct the AI and re-score instantly. |
| **Fixed output format, checked twice** | Gemini, Claude and GPT-4o must all return a set JSON format, and one shared `zod` schema re-checks the result before scoring. |
| **Free AI option** | Gemini's free tier gives real recognition at no cost. If one Gemini model is overloaded, the next one is tried automatically. |
| **Graceful failure** | AI model busy → try another model; AI down → mock recognizer with a warning; backend down → in-browser offline mode. |
| **Privacy** | Photos are never stored on the server, only a SHA-256 fingerprint. Thumbnails stay in the browser. |
| **No login for the demo** | An anonymous per-device id keeps the demo frictionless; production would add accounts. |
| **Navigation that stays in the app** | Each screen has its own URL hash (`#scan`, `#result-<id>`, `#rewards`, `#wardrobe`), so Back goes to the previous screen. |
| **Accessible and responsive** | WCAG AA text contrast in both themes, checked at 13 widths from 320 to 1920 px, reduced-motion support. |

---

## 🌟 Enhancement Proposals

### 🧑‍🤝‍🧑 Product Improvements

#### Enhancing the user experience with additional insights
- **Sustainability comparisons:** "your jeans vs. the average pair", brand-to-brand and material-to-material comparisons, and a **Compare before you buy** mode that scores two items side by side.
- **Shopping mode:** scan an item *before* buying it to see its grade and greener alternatives in stock nearby.
- **Wardrobe dashboard:** CO₂e per wear and cost per wear across the wardrobe, monthly trends, and goals.
- **Shareable impact card:** "This month I saved 23 kg CO₂e", plus streaks and challenges.
- **Closing the loop:** for high-impact items, suggest **repair, resell or donate**, with partner links.
- **Trustworthy rewards:** verify second-hand claims through partner receipts, and issue real single-use vouchers.
- **Accounts and sync:** sign in so the wallet and wardrobe follow the user across devices.

#### Improving the carbon scoring model with more detailed data
- **Product passports:** read barcodes and QR codes and look up brand data and the EU **Digital Product Passport** for exact materials, weight and country of manufacture.
- **Country-specific manufacturing:** use the electricity grid's carbon intensity where the item was made.
- **Full lifecycle:** washing temperature, tumble-drying and number of washes (use phase), plus landfill, donation and recycling (end of life).
- **Dyeing and finishing:** stone-washed denim, synthetic dyes, leather tanning methods.
- **Uncertainty ranges:** show "11–16 kg" when materials are guessed rather than read from the label.
- **Recognition accuracy:** build a labelled photo set to measure and tune the AI, and use user corrections as training signals.

### ⚙️ Technical Scaling

#### Scaling the backend for larger user loads
- **Stateless API + managed data:** swap the in-memory store (same interface) for **PostgreSQL** (users, scans, redemptions) and **Redis** (sessions, rate limits, caching). The API then scales horizontally behind a load balancer.
- **Async image pipeline:** the app uploads directly to object storage (S3 or Azure Blob) with pre-signed URLs, recognition jobs go on a **queue** (SQS, Pub/Sub or BullMQ), and autoscaling workers process them. Clients poll or receive a WebSocket update, so slow AI calls never block web servers.
- **Lower AI cost:** cache results by image fingerprint, shrink images in the browser (already done), and batch non-urgent re-scoring.
- **Protection:** per-user and per-IP rate limits, size limits (already 10 MB), auth tokens instead of anonymous ids, and abuse detection on point claims.
- **Delivery:** static frontend on a CDN; only `/api` traffic reaches the servers.
- **Observability:** structured logs, OpenTelemetry traces across API, queue and workers, and dashboards for latency, errors and cost per scan.

#### Integrating external APIs for real-time data
- **Emission factors:** Climatiq, Higg MSI / Cascale, Textile Exchange or ecoinvent, behind a cached `EmissionFactorProvider` interface. The current in-memory dictionary becomes one provider among several.
- **Grid carbon intensity:** Electricity Maps or WattTime for real-time manufacturing and washing emissions by country.
- **Product data:** retailer catalogues and Digital Product Passports by barcode or GTIN.
- **Rewards partners:** partner APIs for real voucher issuance, redemption tracking and second-hand marketplace listings.

---

## 📲 Deployment

### Deploy as a single Node service (Render, Railway or Heroku)

| Setting | Value |
| --- | --- |
| Build command | `npm install && npm run build` |
| Start command | `npm start` |
| Environment variables | `GEMINI_API_KEY` (free), `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` (optional); `NODE_VERSION=22` if asked |

The server serves the app and the API on one port (`PORT`). These platforms use HTTPS, so the phone's live camera works too.

### Deploy without GitHub (Railway CLI)

Railway can upload the project folder straight from your computer:

```bash
npm install -g @railway/cli
railway login                                     # opens the browser
cd ecoscan
railway init                                      # create an empty project
railway up                                        # upload and deploy
railway variables --set "GEMINI_API_KEY=your-key" # optional: real recognition
railway domain                                    # prints your public https:// link
```

Run `railway up` again to deploy changes. Railway gives trial credit, then charges by usage. Data is in memory, so it resets when the service restarts.

### Frontend-only hosting (Vercel or Netlify)

Deploying only `frontend/` (build command `npm run build -w frontend`, output `frontend/dist`) also works. Quickest of all: run `npm install && npm run build -w frontend`, then drag the `frontend/dist` folder onto **https://app.netlify.com/drop**. With no backend, the app runs in **offline mode** in the browser, so to get AI recognition, deploy the full Node service instead.

### Live demo

**https://claude.ai/artifact/F8SafG5SDKwJZgT6SMCsWX**

A browser-only build of the same app (`npm run build:demo -w frontend` creates one self-contained HTML file). On claude.ai, real photos are identified by Claude through the viewer's account.

---

## 🛠 Troubleshooting

| Problem | Fix |
| --- | --- |
| `npm install` fails or the app won't start | Check `node -v` is **20.19 or newer** (22 recommended). |
| "Offline mode" banner appears | The backend isn't reachable. Make sure you started with `npm run dev` (it starts both servers), and check the terminal for errors. |
| Phone can't open the app | Use the **Network** address (your computer's IP), not `localhost`; same Wi-Fi; allow Node through the firewall. |
| Camera doesn't open on the phone | Open the page in Chrome or Safari (some in-app browsers block cameras), or use **Upload**. |
| Port already in use | Change `PORT` in `backend/.env`, or stop the other program using port 3001 or 5173. |
| Recognition looks random (e.g. a screenshot becomes a shirt) | No API key is set, so it's in demo mode. Add a free `GEMINI_API_KEY` (or an Anthropic/OpenAI key) to `backend/.env` and restart. |
| "The vision model was unavailable" warning | The AI provider was busy or the key is wrong. Gemini's free models are sometimes overloaded, so try again in a minute; check the key in `backend/.env`; the terminal shows the exact error. |

---

## 🙏 Credits

- **Sample photos:** six images from Alexey Grigorev's [clothing dataset](https://github.com/alexeygrigorev/clothing-dataset), released under **CC0** (public domain), cropped and stripped of photo metadata.
- **Emission factors:** rounded from public sources listed under [Carbon Score Assumptions](#-carbon-score-assumptions).
- **Partner offers:** fictional, for demonstration only.

### Thank you for building a greener future with EcoScan! 🌍🤎
