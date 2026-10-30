// Banco SQLite embutido no Node (node:sqlite), sem dependência nativa.
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  DEFAULT_PREFS,
  DEFAULT_SETTINGS,
  type AlertPrefs,
  type AlertType,
  type DeviceSettings,
  type DeviceState,
  type Lang,
  type Platform,
} from '@league-alert/shared';

export interface DeviceRow {
  id: string;
  platform: Platform;
  pushToken: string | null;
  prefs: AlertPrefs;
  settings: DeviceSettings;
  lang: Lang;
}

export class Db {
  private db: DatabaseSync;

  constructor(path = new URL('../data/league-alert.db', import.meta.url).pathname) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS devices (
        id TEXT PRIMARY KEY,
        platform TEXT NOT NULL,
        push_token TEXT,
        prefs TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS favorites (
        device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
        team_id TEXT NOT NULL,
        PRIMARY KEY (device_id, team_id)
      );
      CREATE TABLE IF NOT EXISTS game_subs (
        device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
        game_id TEXT NOT NULL,
        PRIMARY KEY (device_id, game_id)
      );
      CREATE TABLE IF NOT EXISTS sent_events (
        key TEXT PRIMARY KEY,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    // Migrações: colunas adicionadas depois da primeira versão.
    this.addColumn('lang', `TEXT NOT NULL DEFAULT 'pt'`);
    this.addColumn('hide_scores', 'INTEGER NOT NULL DEFAULT 0');
    this.addColumn('delay_seconds', 'INTEGER NOT NULL DEFAULT 0');
  }

  private addColumn(name: string, ddl: string): void {
    const cols = this.db.prepare('PRAGMA table_info(devices)').all() as any[];
    if (!cols.some((c) => c.name === name)) this.db.exec(`ALTER TABLE devices ADD COLUMN ${name} ${ddl}`);
  }

  registerDevice(id: string, platform: Platform, pushToken: string | null, lang: Lang = 'en'): void {
    this.db
      .prepare(
        `INSERT INTO devices (id, platform, push_token, prefs, lang) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET platform = excluded.platform, push_token = excluded.push_token,
           lang = excluded.lang`,
      )
      .run(id, platform, pushToken, JSON.stringify(DEFAULT_PREFS), lang);
  }

  getDevice(id: string): DeviceState | null {
    const row = this.db.prepare('SELECT * FROM devices WHERE id = ?').get(id) as any;
    if (!row) return null;
    const favorites = this.db.prepare('SELECT team_id FROM favorites WHERE device_id = ?').all(id) as any[];
    const games = this.db.prepare('SELECT game_id FROM game_subs WHERE device_id = ?').all(id) as any[];
    return {
      deviceId: row.id,
      platform: row.platform,
      favorites: favorites.map((f) => f.team_id),
      games: games.map((g) => g.game_id),
      prefs: { ...DEFAULT_PREFS, ...JSON.parse(row.prefs) },
      settings: settingsOf(row),
      lang: row.lang,
    };
  }

  setFavorites(deviceId: string, teamIds: string[]): void {
    this.db.prepare('DELETE FROM favorites WHERE device_id = ?').run(deviceId);
    const ins = this.db.prepare('INSERT OR IGNORE INTO favorites (device_id, team_id) VALUES (?, ?)');
    for (const t of teamIds) ins.run(deviceId, t);
  }

  setGameSub(deviceId: string, gameId: string, on: boolean): void {
    if (on) this.db.prepare('INSERT OR IGNORE INTO game_subs (device_id, game_id) VALUES (?, ?)').run(deviceId, gameId);
    else this.db.prepare('DELETE FROM game_subs WHERE device_id = ? AND game_id = ?').run(deviceId, gameId);
  }

  setPrefs(deviceId: string, prefs: Partial<AlertPrefs>): void {
    const current = this.getDevice(deviceId)?.prefs ?? DEFAULT_PREFS;
    this.db.prepare('UPDATE devices SET prefs = ? WHERE id = ?').run(JSON.stringify({ ...current, ...prefs }), deviceId);
  }

  setSettings(deviceId: string, s: Partial<DeviceSettings>): void {
    const current = this.getDevice(deviceId)?.settings ?? DEFAULT_SETTINGS;
    const next = { ...current, ...s };
    const delay = Math.max(0, Math.min(300, Math.round(Number(next.delaySeconds) || 0)));
    this.db
      .prepare('UPDATE devices SET hide_scores = ?, delay_seconds = ? WHERE id = ?')
      .run(next.hideScores ? 1 : 0, delay, deviceId);
  }

  /** Marca o evento como enviado. Retorna false se ele já tinha sido enviado antes. */
  markSent(key: string): boolean {
    return this.db.prepare('INSERT OR IGNORE INTO sent_events (key) VALUES (?)').run(key).changes > 0;
  }

  /** Aparelhos que seguem o jogo (sino) ou um dos times (favorito) e têm esse tipo de alerta ligado. */
  recipients(gameId: string, teamIds: string[], type: AlertType): DeviceRow[] {
    const rows = this.db
      .prepare(
        `SELECT DISTINCT d.* FROM devices d
         WHERE EXISTS (SELECT 1 FROM game_subs s WHERE s.device_id = d.id AND s.game_id = ?)
            OR EXISTS (SELECT 1 FROM favorites f WHERE f.device_id = d.id AND f.team_id IN (?, ?))`,
      )
      .all(gameId, teamIds[0] ?? '', teamIds[1] ?? '') as any[];
    return rows
      .map((r) => this.toRow(r))
      .filter((d) => d.prefs[type]);
  }

  allDevices(): DeviceRow[] {
    return (this.db.prepare('SELECT * FROM devices').all() as any[]).map((r) => this.toRow(r));
  }

  private toRow(r: any): DeviceRow {
    return {
      id: r.id,
      platform: r.platform,
      pushToken: r.push_token,
      prefs: { ...DEFAULT_PREFS, ...JSON.parse(r.prefs) },
      settings: settingsOf(r),
      lang: r.lang,
    };
  }
}

function settingsOf(row: any): DeviceSettings {
  return { hideScores: Boolean(row.hide_scores), delaySeconds: Number(row.delay_seconds ?? 0) };
}
