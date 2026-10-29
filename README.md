# Matchadachi website: "Every Dachi Has a Matcha. Find Yours."

A five-question quiz that tells a customer their matcha persona (Matcha Curious, Matcha Craver or Matcha Aficionado) and the exact Matchadachi drink to order.

Built with React, Vite and TypeScript. It is meant to be published with GitHub and Cloudflare Pages at **matchadachi.ph**.

---

## What you can edit without touching code

Everything lives in `src/config/`. Each file starts with a `_howToEdit` note.

| File | What it controls |
|---|---|
| `products.json` | Drink names, descriptions, and which versions are sold (Level 1, Level 2, Japan Blend) |
| `personas.json` | Persona names, blends, taste profiles, and explanation text |
| `quiz.json` | Question and answer wording |
| `rules.json` | Which drink each set of answers gets (checked top to bottom, first match wins) |
| `photos.json` | Which photo file goes with each drink and version |
| `site.json` | Campaign line, tagline, the two blends, branch list, social handle, and the tracking ID |

**Brand assets** (logo, mascot, lifestyle photos) are in `public/brand/`. All come from the owner's folder *Matchadachi/For the website*. Website colors use the two logo greens, dark `#445C3F` and light `#8FBB54`, set at the top of `src/index.css`.

**To add product photos:** put the photo in `public/products/` and type its file name in `photos.json`. For example, `"marokokucha.L2": "marokokucha-level-2.jpg"`. A drink with no photo shows a plain Matchadachi placeholder. Use only photos from the folder the owner specified.

**Safety net:** the tests check all 162 possible answer combinations. If you list a drink version in `rules.json` that isn't in `products.json`, the tests fail and Cloudflare won't publish the broken version.

---

## How the recommendation works

1. **Persona (Question 1 only).** Smooth, sweet and creamy → Matcha Curious (Level 1). Stronger → Matcha Craver (Level 2). Nutty and umami → Matcha Aficionado (Japan Blend).
2. **Drink (Questions 2, 3 and 5).** The rules in `rules.json` pick one main drink and one second pick, always at the persona's own level.
3. **Question 4 (familiarity)** only changes how much the result screen explains. It never changes the persona or the drink.
4. **"Something new and exciting"** keeps you at your own level. It never moves Curious or Craver into Japan Blend.
5. **"A bolder version of my usual"** gives Matcha Curious the same drink at Level 2 as the second pick.
6. **Hojicha** is always labeled "Roasted green tea · not matcha".

`recommendations-table.csv` lists the result for every answer combination, so you can check it.

---

## Going live on matchadachi.ph (one-time setup)

1. **Buy the domain** matchadachi.ph (for example from Porkbun or Namecheap). Pick 2 years and turn on auto-renew.
2. **Cloudflare:** create a free account, then **Add a site** → `matchadachi.ph` → Free plan. Copy the 2 nameservers Cloudflare gives you into your domain's nameserver settings at the registrar. This can take a few hours, and up to 24–48 hours.
3. **GitHub:** create a free account and an empty private repository named `matchadachi-website`. Claude uploads this folder there.
4. **Cloudflare Pages:** Workers & Pages → Create → Pages → **Connect to Git** → choose `matchadachi-website`.
   - Framework preset: **Vite** (or React (Vite))
   - Build command: `npm run build`
   - Build output directory: `dist`
5. In the new Pages project, go to **Custom domains** → add `matchadachi.ph` (and `www.matchadachi.ph`).

After that, every change saved to GitHub updates the live site automatically within about a minute.

## Turning on anonymous tracking (optional)

1. Create a free account at umami.is and add the website `matchadachi.ph`.
2. Copy its **Website ID** into `umamiWebsiteId` in `src/config/site.json`.

Tracked events: `quiz_start`, `quiz_complete` (persona and drink), `show_barista_click`, `try_another_click`, `retake_click`. No names, contact details or cookies are collected.

---

## For developers

```bash
npm install
npm run dev        # local preview at http://localhost:5173
npm test           # checks all 162 answer combinations
npm run build      # tests + production build into dist/
```
