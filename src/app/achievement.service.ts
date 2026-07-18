import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

export interface AchievementProgress {
  coins: number;
  balls: number;
  collisions: number;
  upgradeLevels: number;
  prestige: number;
}

export interface Achievement {
  id: string;
  icon: string;
  title: string;
  description: string;
  unlocked: boolean;
}

type AchievementDefinition = Omit<Achievement, 'unlocked'> & {
  condition: (progress: AchievementProgress) => boolean;
};

const DEFINITIONS: AchievementDefinition[] = [
  { id: 'first-ball', icon: '🔵', title: 'Es rollt!', description: 'Schieße deine erste Kugel.', condition: value => value.balls >= 1 },
  { id: 'first-coins', icon: '🪙', title: 'Kleingeld', description: 'Besitze mindestens 100 Münzen.', condition: value => value.coins >= 100 },
  { id: 'collider', icon: '💥', title: 'Kollisionskurs', description: 'Erreiche insgesamt 100 Ball-Kollisionen.', condition: value => value.collisions >= 100 },
  { id: 'collector', icon: '🌐', title: 'Volles Haus', description: 'Habe 10 Kugeln gleichzeitig im System.', condition: value => value.balls >= 10 },
  { id: 'engineer', icon: '🛠️', title: 'Ingenieur', description: 'Kaufe insgesamt 10 Upgrade-Level.', condition: value => value.upgradeLevels >= 10 },
  { id: 'prestige', icon: '✨', title: 'Neuanfang', description: 'Führe deinen ersten Prestige durch.', condition: value => value.prestige >= 1 }
];

@Injectable({ providedIn: 'root' })
export class AchievementService {
  private readonly storageKey = 'ballsAndMoneyAchievements';
  private unlockedIds = new Set<string>(this.readUnlockedIds());
  private readonly achievementsSubject = new BehaviorSubject<Achievement[]>(this.createSnapshot());
  private readonly unlockedSubject = new Subject<Achievement>();

  readonly achievements$ = this.achievementsSubject.asObservable();
  readonly unlocked$ = this.unlockedSubject.asObservable();

  evaluate(progress: AchievementProgress): void {
    for (const definition of DEFINITIONS) {
      if (!this.unlockedIds.has(definition.id) && definition.condition(progress)) {
        this.unlockedIds.add(definition.id);
        const achievement = this.toAchievement(definition);
        this.persist();
        this.achievementsSubject.next(this.createSnapshot());
        this.unlockedSubject.next(achievement);
      }
    }
  }

  reset(): void {
    this.unlockedIds.clear();
    localStorage.removeItem(this.storageKey);
    this.achievementsSubject.next(this.createSnapshot());
  }

  private createSnapshot(): Achievement[] {
    return DEFINITIONS.map(definition => this.toAchievement(definition));
  }

  private toAchievement(definition: AchievementDefinition): Achievement {
    return {
      id: definition.id,
      icon: definition.icon,
      title: definition.title,
      description: definition.description,
      unlocked: this.unlockedIds.has(definition.id)
    };
  }

  private readUnlockedIds(): string[] {
    try {
      const value = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      return Array.isArray(value) ? value.filter(id => typeof id === 'string') : [];
    } catch {
      return [];
    }
  }

  private persist(): void {
    localStorage.setItem(this.storageKey, JSON.stringify([...this.unlockedIds]));
  }
}
