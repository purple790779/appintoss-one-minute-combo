# One Minute Combo

Vite + React + TypeScript bootstrap for the One Minute Combo prototype.

## Version

See [VERSION.txt](./VERSION.txt).

## Requirements

- Node.js 18+
- npm

## Install

```bash
npm install
```

## Run (dev)

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Deploy (GitHub Pages via Actions)

1. Ensure repository **Settings → Pages → Source** is set to **GitHub Actions**.
2. Push to `main`. The workflow builds and deploys to Pages.

> Note: `vite.config.ts` uses `base: "/appintoss-one-minute-combo/"` to match the GitHub Pages path.

## Structure

```text
src/
  App.tsx
  game/
    BootScene.ts
    PlayScene.ts
    createGame.ts
  store/
    gameStore.ts
```
