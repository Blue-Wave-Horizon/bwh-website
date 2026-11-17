# Blue Wave Horizon — Website

Corporate website for Blue Wave Horizon Ltd., built with [Astro](https://astro.build) and [Tailwind CSS v4](https://tailwindcss.com), deployed on [Cloudflare Pages](https://pages.cloudflare.com).

---

## Prerequisites

- **Node.js ≥ 22** (recommend using nvm: `nvm use 22`)
- **npm ≥ 9**

---

## Local Development

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:4321)
npm run dev
```

Copy `.env.example` to `.env` and set the Worker URL:

```bash
cp .env.example .env
# Then edit .env and set PUBLIC_WORKER_URL to your deployed Worker URL
```

---

## Build

```bash
npm run build
```

Output is written to `dist/`. Preview the production build locally with:

```bash
npm run preview
```

---

## Deployment — Cloudflare Pages

1. Push the repository to GitHub (or GitLab).
2. In the [Cloudflare Dashboard](https://dash.cloudflare.com), create a new **Pages** project.
3. Connect to your Git repository.
4. Set the following build settings:
   - **Framework preset:** Astro
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
5. Add the environment variable:
   - `PUBLIC_WORKER_URL` → your deployed Cloudflare Worker URL
6. Deploy.

---

## Cloudflare Worker (Contact Form)

The contact form backend lives in `worker/`. It receives form submissions and sends them via ZeptoMail.

### Setup

```bash
# From the project root
cd worker

# Install Wrangler globally if you haven't already
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Set your ZeptoMail API key as a secret (never commit this)
wrangler secret put ZEPTO_API_KEY

# Deploy the Worker
wrangler deploy
```

After deployment, Wrangler will print the Worker URL. Copy it and set it as `PUBLIC_WORKER_URL` in your Cloudflare Pages environment variables.

---

## Google Search Console Verification

Google Search Console requires you to prove ownership of `bluewavehorizon.com` before it indexes the site. There are two methods:

### Method 1 — HTML File (Recommended for Cloudflare Pages)

1. Go to [Google Search Console](https://search.google.com/search-console).
2. Add a property for `https://bluewavehorizon.com`.
3. Choose **HTML file** verification.
4. Download the verification file (named something like `google1234abcd.html`).
5. Place the file in the `public/` directory of this project:
   ```
   public/google1234abcd.html
   ```
6. Commit and push. Cloudflare Pages will deploy it automatically.
7. Return to Search Console and click **Verify**.

### Method 2 — DNS TXT Record (Recommended if domain is on Cloudflare)

1. In Search Console, choose **DNS record** verification.
2. Copy the TXT record value (starts with `google-site-verification=...`).
3. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → your domain → **DNS**.
4. Click **Add record**:
   - **Type:** TXT
   - **Name:** `@`
   - **Content:** (paste the value from Search Console)
   - **TTL:** Auto
5. Click **Save**.
6. Return to Search Console and click **Verify** (may take a few minutes to propagate).

---

## Google Play Console (Android App Links)

When the Velopad Android app is submitted to the Play Store:

1. Obtain the app's **SHA-256 certificate fingerprint** from the Play Console (App signing section).
2. Edit `public/.well-known/assetlinks.json` — replace `REPLACE_WITH_SHA256_FINGERPRINT` with the real fingerprint.
3. Confirm `package_name` is `com.bluewavehorizon.velopad`.
4. Deploy the change.

---

## Apple Developer (Universal Links)

When an iOS app is registered:

1. Obtain your **Team ID** from the Apple Developer portal.
2. Edit `public/.well-known/apple-app-site-association`.
3. Replace `TEAMID` in `appID` with your actual Team ID.
4. Deploy the change.

---

## Adding a New Product

1. Add an entry to `src/data/products.ts` (follow the existing structure).
2. Create a new page at `src/pages/products/[product-name].astro`.
3. The Products index page (`/products`) auto-updates — the `ProductGrid` component reads from `products.ts`.

---

## Project Structure

```
blue-wave-horizon-site/
├── src/
│   ├── components/
│   │   ├── layout/       # BaseLayout, Header, Footer
│   │   ├── sections/     # Hero, ProductGrid, FounderBio, ContactForm
│   │   └── ui/           # Button, Badge, SectionHeading, ProductCard
│   ├── data/
│   │   └── products.ts   # Product data source
│   ├── pages/            # Astro file-based routes
│   │   ├── index.astro
│   │   ├── about.astro
│   │   ├── contact.astro
│   │   └── products/
│   │       ├── index.astro
│   │       ├── dwellr.astro
│   │       └── velopad.astro
│   └── styles/
│       └── global.css    # Tailwind v4 + design tokens
├── public/
│   ├── images/           # Logo, OG image, product screenshots (client-provided)
│   ├── robots.txt
│   └── .well-known/      # assetlinks.json, apple-app-site-association
├── worker/
│   ├── index.ts          # Cloudflare Worker source
│   └── wrangler.toml     # Worker config (no secrets here)
├── .env.example
├── astro.config.mjs
└── package.json
```

---

## Environment Variables

| Variable | Where | Description |
|---|---|---|
| `PUBLIC_WORKER_URL` | Cloudflare Pages → Settings → Environment Variables | URL of the deployed contact form Worker |
| `ZEPTO_API_KEY` | Worker secret (via `wrangler secret put`) | ZeptoMail API key — **never commit** |

---

*Blue Wave Horizon Ltd. · RC 9357879 · D-U-N-S 669828461*
