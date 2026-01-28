import Phaser from 'phaser';
import { type GameState, useGameStore } from '../store/gameStore';

const COLS = 6;
const ROWS = 8;
const TYPES = 6;
const COMBO_WINDOW_MS = 1200;
const DROP_DURATION_MS = 180;
const SWAP_DURATION_MS = 200;
const REMOVE_DURATION_MS = 150;
const SHOW_TILE_LABELS =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('debugLabels') === '1';
const DEBUG_INPUT_OVERLAY =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('debugInput') === '1';

const TILE_COLORS = [
  0xff4081, // 진한 핑크
  0xffeb3b, // 노란색
  0x4caf50, // 녹색
  0x2196f3, // 파란색
  0x9c27b0, // 보라색
  0xff5722, // 주황색
];

type TileSprite = Phaser.GameObjects.Arc;
type TileLabel = Phaser.GameObjects.Text;

interface Tile {
  row: number;
  col: number;
  type: number;
  sprite: TileSprite;
  label: TileLabel | null;
  highlight?: Phaser.GameObjects.Arc;
}

export class PlayScene extends Phaser.Scene {
  private board: Array<Array<Tile | null>> = [];
  private boardRoot?: Phaser.GameObjects.Container;
  private tileSize = 48;
  private tileRadius = 18;
  private boardLeft = 0;
  private boardTop = 0;
  private inputLocked = true;
  private unsubscribe?: () => void;
  private debugText?: Phaser.GameObjects.Text;
  private downHandler?: (e: PointerEvent) => void;
  private moveHandler?: (e: PointerEvent) => void;
  private upHandler?: (e: PointerEvent) => void;

  constructor() {
    super('PlayScene');
  }

  create() {
    this.cameras.main.setBackgroundColor('#0f172a');
    this.boardRoot = this.add.container(0, 0);
    
    if (DEBUG_INPUT_OVERLAY) {
      this.debugText = this.add
        .text(12, 12, '', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '12px',
          color: '#e2e8f0',
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          padding: { x: 8, y: 6 },
        })
        .setOrigin(0)
        .setDepth(20)
        .setScrollFactor(0);
    }

    this.createBoard();
    this.setupDomInput();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdown());
    this.scale.on('resize', () => this.layoutBoard());

    const store = useGameStore.getState();
    this.applyGameState(store.gameState);
    this.unsubscribe = useGameStore.subscribe((state, prev) => {
      if (state.sessionId !== prev.sessionId) {
        this.resetBoard();
      }
      if (state.gameState !== prev.gameState) {
        this.applyGameState(state.gameState);
      }
    });
  }

  shutdown() {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.cleanupDomInput();
  }

  private applyGameState(gameState: GameState) {
    if (gameState === 'PLAYING') {
      this.inputLocked = false;
      return;
    }
    this.inputLocked = true;
  }

  private createBoard() {
    this.board = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => null));
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const type = this.pickNonMatchingType(row, col);
        const position = this.getTilePosition(row, col);
        const sprite = this.add.circle(position.x, position.y, this.tileRadius, TILE_COLORS[type]);
        sprite.setStrokeStyle(2, 0x1e293b, 0.3);
        
        // 구슬 하이라이트 (3D 느낌)
        const highlightRadius = this.tileRadius * 0.35;
        const highlightX = position.x - this.tileRadius * 0.25;
        const highlightY = position.y - this.tileRadius * 0.25;
        const highlight = this.add.circle(highlightX, highlightY, highlightRadius, 0xffffff, 0.4);
        
        const label = this.createTileLabel(position.x, position.y, type);
        this.boardRoot?.add([sprite, highlight, label].filter(Boolean) as Phaser.GameObjects.GameObject[]);
        this.board[row][col] = { row, col, type, sprite, label, highlight };
      }
    }
    this.layoutBoard();
  }

  private resetBoard() {
    for (const row of this.board) {
      for (const tile of row) {
        if (!tile) continue;
        tile.sprite.destroy();
        tile.highlight?.destroy();
        tile.label?.destroy();
      }
    }
    this.createBoard();
  }

  private layoutBoard() {
    const width = this.scale.width;
    const height = this.scale.height;
    const padding = Math.min(width, height) * 0.08;
    const availableWidth = width - padding * 2;
    const availableHeight = height - padding * 2;
    this.tileSize = Math.floor(Math.min(availableWidth / COLS, availableHeight / ROWS));
    this.tileRadius = Math.floor(this.tileSize * 0.4);
    const boardWidth = this.tileSize * COLS;
    const boardHeight = this.tileSize * ROWS;
    this.boardLeft = (width - boardWidth) / 2;
    this.boardTop = (height - boardHeight) / 2;
    this.boardRoot?.setPosition(this.boardLeft, this.boardTop);

    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const tile = this.board[row][col];
        if (!tile) continue;
        const pos = this.getTilePosition(row, col);
        tile.sprite.setPosition(pos.x, pos.y);
        tile.sprite.setRadius(this.tileRadius);
        tile.sprite.setStrokeStyle(2, 0x1e293b, 0.3);
        
        if (tile.highlight) {
          const highlightRadius = this.tileRadius * 0.35;
          const highlightX = pos.x - this.tileRadius * 0.25;
          const highlightY = pos.y - this.tileRadius * 0.25;
          tile.highlight.setPosition(highlightX, highlightY);
          tile.highlight.setRadius(highlightRadius);
        }
        
        if (tile.label) {
          tile.label
            .setPosition(pos.x, pos.y)
            .setFontSize(`${Math.max(12, Math.floor(this.tileRadius * 0.9))}px`);
        }
      }
    }
  }

  private setupDomInput() {
    const canvas = this.game.canvas;
    if (!canvas) return;

    canvas.style.touchAction = 'none';

    let dragStartTile: Tile | null = null;

    this.downHandler = (e: PointerEvent) => {
      if (this.inputLocked) return;
      const tile = this.getTileAtClient(e.clientX, e.clientY);
      if (!tile) return;
      dragStartTile = tile;
      this.highlightTile(tile, true);
      console.log('👆 선택:', { col: tile.col, row: tile.row, type: tile.type });
      e.preventDefault();
    };

    this.moveHandler = (e: PointerEvent) => {
      if (this.inputLocked || !dragStartTile) return;
      const tile = this.getTileAtClient(e.clientX, e.clientY);
      if (!tile || tile === dragStartTile) return;
      
      const isAdjacent = Math.abs(tile.row - dragStartTile.row) + Math.abs(tile.col - dragStartTile.col) === 1;
      if (!isAdjacent) return;

      console.log('🔄 스왑:', { from: `(${dragStartTile.col},${dragStartTile.row})`, to: `(${tile.col},${tile.row})` });
      this.highlightTile(dragStartTile, false);
      void this.handleSwap(dragStartTile, tile);
      dragStartTile = null;
      e.preventDefault();
    };

    const cancelDrag = () => {
      if (dragStartTile) {
        this.highlightTile(dragStartTile, false);
        dragStartTile = null;
      }
    };

    this.upHandler = (e: PointerEvent) => {
      cancelDrag();
      e.preventDefault();
    };

    // 이벤트 충돌 방지 핸들러
    const handleVisibilityChange = () => {
      if (document.hidden) {
        cancelDrag();
      }
    };

    const handleBlur = () => {
      cancelDrag();
    };

    canvas.addEventListener('pointerdown', this.downHandler, { passive: false });
    canvas.addEventListener('pointermove', this.moveHandler, { passive: false });
    canvas.addEventListener('pointerup', this.upHandler, { passive: false });
    canvas.addEventListener('pointercancel', this.upHandler, { passive: false });
    canvas.addEventListener('pointerleave', this.upHandler, { passive: false });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    // cleanup을 위해 저장
    (canvas as any)._visibilityHandler = handleVisibilityChange;
    (canvas as any)._blurHandler = handleBlur;
  }

  private cleanupDomInput() {
    const canvas = this.game.canvas;
    if (!canvas) return;
    if (this.downHandler) canvas.removeEventListener('pointerdown', this.downHandler);
    if (this.moveHandler) canvas.removeEventListener('pointermove', this.moveHandler);
    if (this.upHandler) {
      canvas.removeEventListener('pointerup', this.upHandler);
      canvas.removeEventListener('pointercancel', this.upHandler);
      canvas.removeEventListener('pointerleave', this.upHandler);
    }
    const visibilityHandler = (canvas as any)._visibilityHandler;
    const blurHandler = (canvas as any)._blurHandler;
    if (visibilityHandler) {
      document.removeEventListener('visibilitychange', visibilityHandler);
    }
    if (blurHandler) {
      window.removeEventListener('blur', blurHandler);
    }
  }

  update() {
    if (DEBUG_INPUT_OVERLAY && this.debugText) {
      const store = useGameStore.getState();
      this.debugText.setText([
        `state: ${store.gameState}  locked: ${this.inputLocked}`,
        `score: ${store.score}  combo: ${store.combo}`,
      ]);
    }
  }

  private async handleSwap(tile1: Tile, tile2: Tile) {
    this.inputLocked = true;

    // 보드 데이터 스왑
    this.board[tile1.row][tile1.col] = tile2;
    this.board[tile2.row][tile2.col] = tile1;
    const tempRow = tile1.row;
    const tempCol = tile1.col;
    tile1.row = tile2.row;
    tile1.col = tile2.col;
    tile2.row = tempRow;
    tile2.col = tempCol;

    // 스왑 애니메이션
    await this.swapAnimation(tile1, tile2);

    // 매치 체크 및 처리
    await this.checkAndResolveMatches();

    this.inputLocked = useGameStore.getState().gameState !== 'PLAYING';
  }

  private swapAnimation(tile1: Tile, tile2: Tile) {
    const pos1 = this.getTilePosition(tile1.row, tile1.col);
    const pos2 = this.getTilePosition(tile2.row, tile2.col);
    
    return Promise.all([
      this.tweenTile(tile1, pos1.x, pos1.y, SWAP_DURATION_MS),
      this.tweenTile(tile2, pos2.x, pos2.y, SWAP_DURATION_MS),
    ]);
  }

  private async checkAndResolveMatches() {
    let hasMatches = true;
    while (hasMatches) {
      const matches = this.findMatches();
      if (matches.length === 0) {
        hasMatches = false;
        break;
      }

      console.log('💥 매치:', matches.length, '개');
      
      const now = this.time.now;
      const store = useGameStore.getState();
      const lastClearAtMs = store.lastClearAtMs;
      const nextCombo =
        lastClearAtMs > 0 && now - lastClearAtMs <= COMBO_WINDOW_MS
          ? store.combo + 1
          : 0;
      store.setCombo(nextCombo);
      store.setLastClearAtMs(now);

      const baseScore = matches.length * matches.length * 10;
      const scoreMultiplier = 1 + nextCombo * 0.15;
      const finalScore = Math.round(baseScore * scoreMultiplier);
      useGameStore.getState().addScore(finalScore);

      await this.removeTiles(matches);
      await this.collapseBoard();
    }
  }

  private findMatches(): Tile[] {
    const matched = new Set<Tile>();

    // 가로 매치 체크
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS - 2; col += 1) {
        const tile1 = this.board[row][col];
        const tile2 = this.board[row][col + 1];
        const tile3 = this.board[row][col + 2];
        if (tile1 && tile2 && tile3 && tile1.type === tile2.type && tile2.type === tile3.type) {
          matched.add(tile1);
          matched.add(tile2);
          matched.add(tile3);
        }
      }
    }

    // 세로 매치 체크
    for (let col = 0; col < COLS; col += 1) {
      for (let row = 0; row < ROWS - 2; row += 1) {
        const tile1 = this.board[row][col];
        const tile2 = this.board[row + 1][col];
        const tile3 = this.board[row + 2][col];
        if (tile1 && tile2 && tile3 && tile1.type === tile2.type && tile2.type === tile3.type) {
          matched.add(tile1);
          matched.add(tile2);
          matched.add(tile3);
        }
      }
    }

    return Array.from(matched);
  }

  private getTileAtClient(clientX: number, clientY: number): Tile | null {
    const bounds = this.scale.canvasBounds;
    if (!bounds || bounds.width === 0) return null;

    const gameX = (clientX - bounds.left) * (this.scale.width / bounds.width);
    const gameY = (clientY - bounds.top) * (this.scale.height / bounds.height);

    const localX = gameX - this.boardLeft;
    const localY = gameY - this.boardTop;

    if (
      localX < 0 ||
      localX >= this.tileSize * COLS ||
      localY < 0 ||
      localY >= this.tileSize * ROWS
    ) {
      return null;
    }

    const col = Math.floor(localX / this.tileSize);
    const row = Math.floor(localY / this.tileSize);
    return this.board[row]?.[col] ?? null;
  }

  private highlightTile(tile: Tile, isActive: boolean) {
    if (isActive) {
      this.tweens.add({
        targets: [tile.sprite, tile.highlight, tile.label].filter(Boolean),
        scale: 1.15,
        duration: 100,
        ease: 'Back.out',
      });
      tile.sprite.setStrokeStyle(5, 0xffffff, 1);
    } else {
      this.tweens.add({
        targets: [tile.sprite, tile.highlight, tile.label].filter(Boolean),
        scale: 1,
        duration: 100,
        ease: 'Quad.out',
      });
      tile.sprite.setStrokeStyle(2, 0x1e293b, 0.3);
    }
  }

  private removeTiles(tiles: Tile[]) {
    return new Promise<void>((resolve) => {
      let completed = 0;
      const total = tiles.length;
      for (const tile of tiles) {
        this.board[tile.row][tile.col] = null;
        const targets = [tile.sprite, tile.highlight, tile.label].filter(Boolean) as Phaser.GameObjects.GameObject[];
        
        // 펑! 하는 느낌의 제거 애니메이션
        this.tweens.add({
          targets,
          scale: { from: 1, to: 1.3 },
          alpha: { from: 1, to: 0 },
          duration: REMOVE_DURATION_MS,
          ease: 'Back.in',
          onComplete: () => {
            tile.sprite.destroy();
            tile.highlight?.destroy();
            tile.label?.destroy();
            completed += 1;
            if (completed >= total) {
              resolve();
            }
          },
        });
      }
    });
  }

  private async collapseBoard() {
    const tweens: Promise<void>[] = [];
    for (let col = 0; col < COLS; col += 1) {
      let writeRow = ROWS - 1;
      for (let row = ROWS - 1; row >= 0; row -= 1) {
        const tile = this.board[row][col];
        if (!tile) continue;
        if (writeRow !== row) {
          this.board[writeRow][col] = tile;
          this.board[row][col] = null;
          tile.row = writeRow;
          const target = this.getTilePosition(writeRow, col);
          tweens.push(this.tweenTile(tile, target.x, target.y, DROP_DURATION_MS));
        }
        writeRow -= 1;
      }
      const missing = writeRow + 1;
      for (let i = 0; i < missing; i += 1) {
        const row = i;
        const type = this.pickNonMatchingType(row, col);
        const startPos = this.getTilePosition(-1 - i, col);
        const targetPos = this.getTilePosition(row, col);
        const sprite = this.add.circle(startPos.x, startPos.y, this.tileRadius, TILE_COLORS[type]);
        sprite.setStrokeStyle(2, 0x1e293b, 0.3);
        
        // 구슬 하이라이트
        const highlightRadius = this.tileRadius * 0.35;
        const highlightX = startPos.x - this.tileRadius * 0.25;
        const highlightY = startPos.y - this.tileRadius * 0.25;
        const highlight = this.add.circle(highlightX, highlightY, highlightRadius, 0xffffff, 0.4);
        
        const label = this.createTileLabel(startPos.x, startPos.y, type);
        const tile: Tile = { row, col, type, sprite, label, highlight };
        this.boardRoot?.add([sprite, highlight, label].filter(Boolean) as Phaser.GameObjects.GameObject[]);
        this.board[row][col] = tile;
        tweens.push(this.tweenTile(tile, targetPos.x, targetPos.y, DROP_DURATION_MS));
      }
    }
    await Promise.all(tweens);
  }

  private tweenTile(tile: Tile, x: number, y: number, duration: number) {
    return new Promise<void>((resolve) => {
      // 구슬 본체 이동
      this.tweens.add({
        targets: tile.sprite,
        x,
        y,
        duration,
        ease: 'Quad.out',
        onComplete: () => resolve(),
      });
      
      // 하이라이트 이동
      if (tile.highlight) {
        const highlightX = x - this.tileRadius * 0.25;
        const highlightY = y - this.tileRadius * 0.25;
        this.tweens.add({
          targets: tile.highlight,
          x: highlightX,
          y: highlightY,
          duration,
          ease: 'Quad.out',
        });
      }
      
      // 라벨 이동
      if (tile.label) {
        this.tweens.add({
          targets: tile.label,
          x,
          y,
          duration,
          ease: 'Quad.out',
        });
      }
    });
  }

  private createTileLabel(x: number, y: number, type: number) {
    if (!SHOW_TILE_LABELS) return null;
    return this.add
      .text(x, y, `${type + 1}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: `${Math.max(12, Math.floor(this.tileRadius * 0.9))}px`,
        color: '#0f172a',
      })
      .setOrigin(0.5);
  }

  private getTilePosition(row: number, col: number) {
    return {
      x: col * this.tileSize + this.tileSize / 2,
      y: row * this.tileSize + this.tileSize / 2,
    };
  }

  private pickNonMatchingType(row: number, col: number) {
    const forbidden = new Set<number>();
    if (col >= 2) {
      const left = this.board[row]?.[col - 1];
      const left2 = this.board[row]?.[col - 2];
      if (left && left2 && left.type === left2.type) {
        forbidden.add(left.type);
      }
    }
    if (row >= 2) {
      const up = this.board[row - 1]?.[col];
      const up2 = this.board[row - 2]?.[col];
      if (up && up2 && up.type === up2.type) {
        forbidden.add(up.type);
      }
    }
    const candidates = [];
    for (let type = 0; type < TYPES; type += 1) {
      if (!forbidden.has(type)) {
        candidates.push(type);
      }
    }
    if (candidates.length === 0) {
      return Phaser.Math.Between(0, TYPES - 1);
    }
    return candidates[Phaser.Math.Between(0, candidates.length - 1)];
  }
}
