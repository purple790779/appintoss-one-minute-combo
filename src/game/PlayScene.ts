import Phaser from 'phaser';
import { type GameState, useGameStore } from '../store/gameStore';

const COLS = 6;
const ROWS = 8;
const TYPES = 6;
const DRAG_MATCH_MIN = 3;
const COMBO_WINDOW_MS = 1200;
const DROP_DURATION_MS = 160;
const SHOW_TILE_LABELS =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('debugLabels') === '1';

const TILE_COLORS = [
  0x38bdf8,
  0x60a5fa,
  0xf472b6,
  0xfbbf24,
  0x34d399,
  0xa78bfa,
];

type TileSprite = Phaser.GameObjects.Arc;
type TileLabel = Phaser.GameObjects.Text;

interface Tile {
  row: number;
  col: number;
  type: number;
  sprite: TileSprite;
  label: TileLabel | null;
}

export class PlayScene extends Phaser.Scene {
  private board: Array<Array<Tile | null>> = [];
  private tileSize = 48;
  private tileRadius = 18;
  private boardLeft = 0;
  private boardTop = 0;
  private activePath: Tile[] = [];
  private activeType: number | null = null;
  private lineGraphics?: Phaser.GameObjects.Graphics;
  private inputLocked = true;
  private unsubscribe?: () => void;
  private isSelecting = false;

  constructor() {
    super('PlayScene');
  }

  create() {
    this.cameras.main.setBackgroundColor('#0f172a');
    this.lineGraphics = this.add.graphics({ lineStyle: { width: 6, color: 0xffffff } });
    this.lineGraphics.setDepth(10);

    this.createBoard();
    this.layoutBoard();
    this.registerInput();

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
  }

  private applyGameState(gameState: GameState) {
    if (gameState === 'PLAYING') {
      this.inputLocked = false;
      this.clearPath();
      return;
    }
    this.inputLocked = true;
    this.clearPath();
  }

  private createBoard() {
    this.board = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => null));
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const type = Phaser.Math.Between(0, TYPES - 1);
        const position = this.getTilePosition(row, col);
        const sprite = this.add.circle(position.x, position.y, this.tileRadius, TILE_COLORS[type]);
        sprite.setStrokeStyle(2, 0x0f172a);
        const label = this.createTileLabel(position.x, position.y, type);
        this.board[row][col] = { row, col, type, sprite, label };
      }
    }
  }

  private resetBoard() {
    this.clearPath();
    for (const row of this.board) {
      for (const tile of row) {
        if (!tile) continue;
        tile.sprite.destroy();
        tile.label?.destroy();
      }
    }
    this.createBoard();
    this.layoutBoard();
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

    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const tile = this.board[row][col];
        if (!tile) continue;
        const pos = this.getTilePosition(row, col);
        tile.sprite.setPosition(pos.x, pos.y);
        tile.sprite.setRadius(this.tileRadius);
        tile.sprite.setStrokeStyle(2, 0x0f172a);
        if (tile.label) {
          tile.label
            .setPosition(pos.x, pos.y)
            .setFontSize(`${Math.max(12, Math.floor(this.tileRadius * 0.9))}px`);
        }
      }
    }
    this.redrawPath();
  }

  private registerInput() {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.inputLocked) return;
      const cell = this.getCellFromWorld(pointer.worldX, pointer.worldY);
      if (!cell) return;
      const tile = this.getTileAt(cell.row, cell.col);
      if (!tile) return;
      this.activeType = tile.type;
      this.activePath = [tile];
      this.highlightTile(tile, true);
      this.redrawPath();
      this.isSelecting = true;
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.inputLocked || !this.isSelecting) return;
      const cell = this.getCellFromWorld(pointer.worldX, pointer.worldY);
      this.tryExtendPath(cell);
    });

    const finishPath = () => {
      if (this.inputLocked) return;
      if (this.activePath.length >= DRAG_MATCH_MIN) {
        void this.resolveMatch(this.activePath);
      } else {
        this.clearPath();
      }
      this.isSelecting = false;
    };

    this.input.on('pointerup', finishPath);
    this.input.on('pointerupoutside', finishPath);
  }

  update() {
    if (this.inputLocked || this.activeType === null || !this.isSelecting) return;
    const pointer = this.input.activePointer;
    if (!pointer.isDown) return;
    const cell = this.getCellFromWorld(pointer.worldX, pointer.worldY);
    this.tryExtendPath(cell);
  }

  private tryExtendPath(cell: { row: number; col: number } | null) {
    if (!cell) return;
    const tile = this.getTileAt(cell.row, cell.col);
    if (!tile || tile.type !== this.activeType) return;
    const last = this.activePath[this.activePath.length - 1];
    if (!last) return;
    const isAdjacent = Math.abs(tile.row - last.row) + Math.abs(tile.col - last.col) === 1;
    if (!isAdjacent) return;
    const existingIndex = this.activePath.indexOf(tile);
    if (existingIndex === this.activePath.length - 2) {
      const removed = this.activePath.pop();
      if (removed) this.highlightTile(removed, false);
      this.redrawPath();
      return;
    }
    if (existingIndex !== -1) return;
    this.activePath.push(tile);
    this.highlightTile(tile, true);
    this.redrawPath();
  }

  private highlightTile(tile: Tile, isActive: boolean) {
    if (isActive) {
      tile.sprite.setScale(1.08);
      tile.sprite.setStrokeStyle(4, 0xffffff);
      if (tile.label) {
        tile.label.setScale(1.08);
      }
    } else {
      tile.sprite.setScale(1);
      tile.sprite.setStrokeStyle(2, 0x0f172a);
      if (tile.label) {
        tile.label.setScale(1);
      }
    }
  }

  private clearPath() {
    for (const tile of this.activePath) {
      this.highlightTile(tile, false);
    }
    this.activePath = [];
    this.activeType = null;
    this.isSelecting = false;
    this.redrawPath();
  }

  private redrawPath() {
    if (!this.lineGraphics) return;
    this.lineGraphics.clear();
    if (this.activePath.length < 2) return;
    this.lineGraphics.lineStyle(6, 0xffffff, 0.7);
    this.lineGraphics.beginPath();
    const first = this.activePath[0];
    this.lineGraphics.moveTo(first.sprite.x, first.sprite.y);
    for (let i = 1; i < this.activePath.length; i += 1) {
      const tile = this.activePath[i];
      this.lineGraphics.lineTo(tile.sprite.x, tile.sprite.y);
    }
    this.lineGraphics.strokePath();
  }

  private async resolveMatch(path: Tile[]) {
    this.inputLocked = true;
    const tiles = [...path];
    this.clearPath();

    const now = this.time.now;
    const store = useGameStore.getState();
    const lastClearAtMs = store.lastClearAtMs;
    const nextCombo =
      lastClearAtMs > 0 && now - lastClearAtMs <= COMBO_WINDOW_MS
        ? store.combo + 1
        : 0;
    store.setCombo(nextCombo);
    store.setLastClearAtMs(now);

    const baseScore = tiles.length * tiles.length * 10;
    const scoreMultiplier = 1 + nextCombo * 0.15;
    const finalScore = Math.round(baseScore * scoreMultiplier);
    useGameStore.getState().addScore(finalScore);

    await this.removeTiles(tiles);
    await this.collapseBoard();
    this.inputLocked = useGameStore.getState().gameState !== 'PLAYING';
  }

  private removeTiles(tiles: Tile[]) {
    return new Promise<void>((resolve) => {
      let completed = 0;
      const total = tiles.length;
      for (const tile of tiles) {
        this.board[tile.row][tile.col] = null;
        const targets = tile.label ? [tile.sprite, tile.label] : [tile.sprite];
        this.tweens.add({
          targets,
          scale: 0,
          alpha: 0,
          duration: 120,
          ease: 'Back.in',
          onComplete: () => {
            tile.sprite.destroy();
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
          tweens.push(this.tweenTile(tile, target.x, target.y));
        }
        writeRow -= 1;
      }
      const missing = writeRow + 1;
      for (let i = 0; i < missing; i += 1) {
        const row = i;
        const type = Phaser.Math.Between(0, TYPES - 1);
        const startPos = this.getTilePosition(-1 - i, col);
        const targetPos = this.getTilePosition(row, col);
        const sprite = this.add.circle(startPos.x, startPos.y, this.tileRadius, TILE_COLORS[type]);
        sprite.setStrokeStyle(2, 0x0f172a);
        const label = this.createTileLabel(startPos.x, startPos.y, type);
        const tile: Tile = { row, col, type, sprite, label };
        this.board[row][col] = tile;
        tweens.push(this.tweenTile(tile, targetPos.x, targetPos.y));
      }
    }
    await Promise.all(tweens);
  }

  private tweenTile(tile: Tile, x: number, y: number) {
    return new Promise<void>((resolve) => {
      const targets = tile.label ? [tile.sprite, tile.label] : [tile.sprite];
      this.tweens.add({
        targets,
        x,
        y,
        duration: DROP_DURATION_MS,
        ease: 'Quad.out',
        onComplete: () => resolve(),
      });
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

  private getCellFromWorld(x: number, y: number) {
    const col = Math.floor((x - this.boardLeft) / this.tileSize);
    const row = Math.floor((y - this.boardTop) / this.tileSize);
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) {
      return null;
    }
    return { row, col };
  }

  private getTileAt(row: number, col: number) {
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) {
      return null;
    }
    return this.board[row][col];
  }

  private getTilePosition(row: number, col: number) {
    return {
      x: this.boardLeft + col * this.tileSize + this.tileSize / 2,
      y: this.boardTop + row * this.tileSize + this.tileSize / 2,
    };
  }
}
