import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class GameStorageService {
  private readonly saveKey = 'ballsAndMoneySave';

  load<T>(): T | null {
    const raw = localStorage.getItem(this.saveKey);

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as T;
    } catch (error) {
      console.error('Spielstand konnte nicht geladen werden.', error);
      this.clear();
      return null;
    }
  }

  save(data: unknown): void {
    localStorage.setItem(this.saveKey, JSON.stringify(data));
  }

  clear(): void {
    localStorage.removeItem(this.saveKey);
  }
}
