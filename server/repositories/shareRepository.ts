import crypto from 'crypto';
import { Event, ShareSnapshot } from '../../shared/types.ts';

export interface ShareRepository {
  createSnapshot(event: Event, ttlHours?: number): Promise<ShareSnapshot>;
  findByToken(token: string): Promise<ShareSnapshot | null>;
  revoke(token: string): Promise<boolean>;
  cleanExpired(): void;
}

export class InMemoryShareRepository implements ShareRepository {
  private snapshots: Map<string, ShareSnapshot> = new Map();

  async createSnapshot(event: Event, ttlHours: number = 24): Promise<ShareSnapshot> {
    const token = crypto.randomBytes(24).toString('base64url');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000).toISOString();

    const snapshot: ShareSnapshot = {
      token,
      eventId: event.id,
      event: JSON.parse(JSON.stringify(event)),
      createdAt: now.toISOString(),
      expiresAt,
      isRevoked: false,
    };

    this.snapshots.set(token, snapshot);
    return snapshot;
  }

  async findByToken(token: string): Promise<ShareSnapshot | null> {
    const snapshot = this.snapshots.get(token);
    if (!snapshot) return null;
    if (snapshot.isRevoked) return null;
    if (new Date(snapshot.expiresAt).getTime() < Date.now()) {
      this.snapshots.delete(token);
      return null;
    }
    return JSON.parse(JSON.stringify(snapshot));
  }

  async revoke(token: string): Promise<boolean> {
    const snapshot = this.snapshots.get(token);
    if (!snapshot) return false;
    snapshot.isRevoked = true;
    this.snapshots.set(token, snapshot);
    return true;
  }

  cleanExpired(): void {
    const now = Date.now();
    for (const [token, snapshot] of this.snapshots.entries()) {
      if (snapshot.isRevoked || new Date(snapshot.expiresAt).getTime() < now) {
        this.snapshots.delete(token);
      }
    }
  }
}

export const shareRepository = new InMemoryShareRepository();
