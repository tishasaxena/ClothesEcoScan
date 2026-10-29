import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Scan, User } from '../types.js';

interface DbShape {
  users: Record<string, User>;
  scans: Record<string, Scan>;
}

/**
 * Tiny JSON-file store. Plenty for a demo; swap for Postgres/SQLite behind the
 * same interface in production. Pass no path for a purely in-memory store (tests).
 */
export class Store {
  private db: DbShape = { users: {}, scans: {} };

  constructor(private path?: string) {
    if (path && existsSync(path)) {
      this.db = JSON.parse(readFileSync(path, 'utf8')) as DbShape;
    }
  }

  private persist() {
    if (!this.path) return;
    mkdirSync(dirname(this.path), { recursive: true });
    const tmp = `${this.path}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.db, null, 2));
    renameSync(tmp, this.path);
  }

  getOrCreateUser(id: string): User {
    let user = this.db.users[id];
    if (!user) {
      user = { id, points: 0, lifetimePoints: 0, lifetimeSavedKgCO2e: 0, redemptions: [], createdAt: new Date().toISOString() };
      this.db.users[id] = user;
      this.persist();
    }
    return user;
  }

  saveUser(user: User) {
    this.db.users[user.id] = user;
    this.persist();
  }

  getScan(id: string): Scan | undefined {
    return this.db.scans[id];
  }

  saveScan(scan: Scan) {
    this.db.scans[scan.id] = scan;
    this.persist();
  }

  scansForUser(userId: string): Scan[] {
    return Object.values(this.db.scans)
      .filter((s) => s.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  findClaimedScanByHash(userId: string, imageHash: string): Scan | undefined {
    return Object.values(this.db.scans).find((s) => s.userId === userId && s.imageHash === imageHash && s.claimed);
  }
}
