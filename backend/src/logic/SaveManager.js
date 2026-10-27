import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GameStateManager, cleanOwnerName } from './GameState.js';

export const MAX_SLOTS = 3;
const DEFAULT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../saves');

// Maneja los 3 slots de partida (archivos JSON) y la partida activa.
export class SaveManager {
  constructor(dir = DEFAULT_DIR) {
    this.dir = dir;
    fs.mkdirSync(dir, { recursive: true });
    this.slot = null;
    this.game = null;
  }

  file(n) { return path.join(this.dir, `slot-${n}.json`); }
  validSlot(n) { return Number.isInteger(n) && n >= 1 && n <= MAX_SLOTS; }
  read(n) { try { return JSON.parse(fs.readFileSync(this.file(n), 'utf8')); } catch { return null; } }

  list() {
    return Array.from({ length: MAX_SLOTS }, (_, i) => {
      const n = i + 1, d = this.read(n);
      if (!d) return { slot: n, empty: true };
      return {
        slot: n, empty: false, owner: cleanOwnerName(d.owner), level: d.level, stars: d.stars || 0,
        coins: d.coins, rating: d.rating, savedAt: d.savedAt
      };
    });
  }

  save() {
    if (!this.game || !this.slot) return;
    const tmp = this.file(this.slot) + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.game));
    fs.renameSync(tmp, this.file(this.slot));
  }

  create(n, name) {
    if (!this.validSlot(n)) return { success: false, error: 'Slot inválido' };
    if (this.read(n)) return { success: false, error: 'Ese slot ya tiene una partida' };
    this.save();
    this.game = new GameStateManager(cleanOwnerName(name));
    this.slot = n;
    this.save();
    return { success: true };
  }

  load(n) {
    if (!this.validSlot(n)) return { success: false, error: 'Slot inválido' };
    const data = this.read(n);
    if (!data) return { success: false, error: 'Ese slot está vacío' };
    this.save();
    this.game = GameStateManager.fromJSON(data);
    this.slot = n;
    return { success: true };
  }

  remove(n) {
    if (!this.validSlot(n)) return { success: false, error: 'Slot inválido' };
    if (this.slot === n) { this.game = null; this.slot = null; }
    try { fs.unlinkSync(this.file(n)); } catch { /* ya no existía */ }
    return { success: true };
  }

  exit() {
    if (this.game) {
      this.game.finishRun();   // si terminó (ganó/perdió), el slot queda listo para una nueva run
      this.game.paused = false;
      this.save();
    }
    this.game = null;
    this.slot = null;
    return { success: true };
  }
}
