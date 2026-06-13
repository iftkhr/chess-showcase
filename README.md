# 3D Chess Showcase — Fable 5 vs Opus 4.8

A single static site that showcases two independently-built 3D chess apps with a
toggle between them, plus an "Actual Prompt" panel showing the prompts used.

Both apps are Game-of-Thrones-themed 3D chess (React + Three.js / react-three-fiber),
built from the **same prompts** by two different models:

- **`apps/fable5`** — built by Claude Fable 5
- **`apps/opus48`** — built by Claude Opus 4.8

They use incompatible React / r3f versions, so the showcase keeps each app fully
isolated and embeds them via iframes rather than merging them into one bundle.

## Structure

```
apps/fable5      Fable 5 chess app (full source, own package.json)
apps/opus48      Opus 4.8 chess app (full source, own package.json)
shell/           the showcase page (toggle UI + iframes + prompt panel)
build.sh         builds both apps and assembles dist/
dist/            generated deploy output (gitignored)
```

## Develop

Edit either app's source under `apps/<name>`, or the showcase shell under `shell/`.

To run a single app in dev mode:

```bash
cd apps/fable5   # or apps/opus48
npm install
npm run dev
```

## Build & preview the full showcase

```bash
./build.sh
cd dist && python3 -m http.server 8002
# open http://localhost:8002
```

`build.sh` builds each app, copies its output into `dist/fable5` and `dist/opus48`,
and copies the shell to the `dist/` root.

## Deploy

The site is 100% static — deploy the `dist/` folder to any static host.

- **Netlify / Vercel / Cloudflare Pages:** build command `./build.sh`, publish directory `dist`
- **Manual:** run `./build.sh`, then drag `dist/` to Netlify Drop or upload it anywhere
