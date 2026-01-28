# One Minute Combo

토스 앱인토스용 매치-3 퍼즐 게임 - 60초 안에 최고 점수를 달성하세요!

## 게임 소개

구슬을 움직여 같은 색 3개를 만들어 제거하는 매치-3 퍼즐 게임입니다.
- 🎮 직관적인 드래그 조작
- ⏱️ 60초 제한 시간
- 🔥 콤보 시스템
- 📱 모바일 최적화

## Version

See [VERSION.txt](./VERSION.txt).
Release checklist: [APPINTOSS_RELEASE_CHECKLIST.md](./APPINTOSS_RELEASE_CHECKLIST.md).

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
