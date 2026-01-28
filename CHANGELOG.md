# Changelog

## v1.0.0
- feat: 매치-3 퍼즐 게임으로 완전히 재구현
- feat: 구슬 드래그로 인접 구슬과 위치 교환
- feat: 같은 색 3개 이상 나열 시 자동 제거
- feat: 3D 구슬 느낌 (하이라이트 효과)
- feat: 색상 대비 강화 (6가지 명확한 색상)
- feat: 첫 진입 튜토리얼 (1회만 표시)
- feat: 3-2-1-GO! 카운트다운
- feat: 게임 중 종료 확인 모달
- feat: 콤보 애니메이션 효과
- feat: 시작 시 3개 연속 방지 로직
- fix: DOM 포인터 이벤트 기반 입력으로 안정화
- fix: 앱 전환/화면 꺼짐 시 상태 자동 정리
- ui: 선택/제거 애니메이션 개선
- ui: 도움말 매치-3 규칙 반영

## v0.4.4
- fix: mobile (Samsung Internet/Chrome) drag input on scaled boards now uses board-local coordinates.
- fix: resolve TypeScript build error in pointer world coordinate handling.
- debug: input overlay diagnostics via ?debugInput=1.
- fix: prevent overlays from swallowing drag; ensure touch capture.
- fix: mobile drag-chain input fix (positionToCamera + bounds hit-test + polling).
- fix: mobile drag fix (pointer id lock + ignore synthetic mouse).

## v0.4.3
- mobile: fixed bottom START bar (never hidden).
- safe-area + real vh handling.
- prevent page scroll/overscroll; modal keeps internal scroll.

## v0.4.2
- fix: mobile drag-chain input now uses hit-test based selection.
- fix: no-scroll layout using 100dvh + overflow hidden (Chrome address bar issue).

## v0.4.1
- fix: default tile debug labels to off and allow opt-in via ?debugLabels=1.
- fix: prevent mobile overscroll, tap highlights, and touch gestures from interfering with gameplay.
- chore: ignore local artifacts in git.

## v0.4.0
- feat: add link-match drag chain rules with backtrack support, collapse/refill, and combo scoring window.
- ui: show combo HUD state and refresh help modal instructions for link-match play.

## v0.3.0
- feat: refine link-match core gameplay with drag-chain rules, combo bonus, and collapse/refill flow.
- ui: update help modal with link-match controls and combo timing guidance.

## v0.2.2
- docs: add appintoss release checklist

## v0.2.1
- Add PR build check workflow.

## v0.2.0
- Implement 6x8 link-match gameplay with drag-to-chain matching and combo scoring.
- Add tile collapse/refill with quick drop animation and in-game combo HUD display.
- Update help modal to reflect 60-second link-match rules.

## v0.1.2
- Switch UI to a light theme with updated HUD cards, status badge, buttons, and safe-area padding.
- Add a Help modal with upcoming feature notes and control guidance.

## v0.1.1
- Tune HUD layout and timer flow polish.

## v0.1.0
- Bootstrap Vite + React + TypeScript + Phaser + Zustand + Tailwind.
- Add GitHub Pages deployment workflow (Actions).
- Add initial HUD, timer loop, and Phaser boot/play scenes.
