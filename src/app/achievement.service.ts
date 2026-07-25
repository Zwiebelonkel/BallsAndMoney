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
  { id: 'coins-1000', icon: '💰', title: 'Das erste Tausend', description: 'Besitze mindestens 1.000 Münzen.', condition: value => value.coins >= 1_000 },
  { id: 'coins-10000', icon: '💰', title: 'Gefülltes Sparschwein', description: 'Besitze mindestens 10.000 Münzen.', condition: value => value.coins >= 10_000 },
  { id: 'coins-100000', icon: '💎', title: 'Kleines Vermögen', description: 'Besitze mindestens 100.000 Münzen.', condition: value => value.coins >= 100_000 },
  { id: 'coins-1000000', icon: '👑', title: 'Millionär', description: 'Besitze mindestens 1.000.000 Münzen.', condition: value => value.coins >= 1_000_000 },
  { id: 'coins-10000000', icon: '🏦', title: 'Geldspeicher', description: 'Besitze mindestens 10.000.000 Münzen.', condition: value => value.coins >= 10_000_000 },
  { id: 'collider', icon: '💥', title: 'Kollisionskurs', description: 'Erreiche insgesamt 100 Ball-Kollisionen.', condition: value => value.collisions >= 100 },
  { id: 'collisions-1000', icon: '💥', title: 'Crash-Test', description: 'Erreiche insgesamt 1.000 Ball-Kollisionen.', condition: value => value.collisions >= 1_000 },
  { id: 'collisions-10000', icon: '☄️', title: 'Dauerfeuer', description: 'Erreiche insgesamt 10.000 Ball-Kollisionen.', condition: value => value.collisions >= 10_000 },
  { id: 'collisions-100000', icon: '🌋', title: 'Unaufhaltsam', description: 'Erreiche insgesamt 100.000 Ball-Kollisionen.', condition: value => value.collisions >= 100_000 },
  { id: 'collector', icon: '🌐', title: 'Volles Haus', description: 'Habe 10 Kugeln gleichzeitig im System.', condition: value => value.balls >= 10 },
  { id: 'balls-25', icon: '🔵', title: 'Kugelbad', description: 'Habe 25 Kugeln gleichzeitig im System.', condition: value => value.balls >= 25 },
  { id: 'balls-50', icon: '🫧', title: 'Kugel-Chaos', description: 'Habe 50 Kugeln gleichzeitig im System.', condition: value => value.balls >= 50 },
  { id: 'engineer', icon: '🛠️', title: 'Ingenieur', description: 'Kaufe insgesamt 10 Upgrade-Level.', condition: value => value.upgradeLevels >= 10 },
  { id: 'upgrades-25', icon: '🔧', title: 'Tüftler', description: 'Kaufe insgesamt 25 Upgrade-Level.', condition: value => value.upgradeLevels >= 25 },
  { id: 'upgrades-50', icon: '⚙️', title: 'Maschinenmeister', description: 'Kaufe insgesamt 50 Upgrade-Level.', condition: value => value.upgradeLevels >= 50 },
  { id: 'upgrades-100', icon: '🏭', title: 'Vollautomatisch', description: 'Kaufe insgesamt 100 Upgrade-Level.', condition: value => value.upgradeLevels >= 100 },
  { id: 'prestige', icon: '✨', title: 'Neuanfang', description: 'Erreiche Prestige 1.', condition: value => value.prestige >= 1 },
  { id: 'prestige-5', icon: '🌟', title: 'Wiederholungstäter', description: 'Erreiche Prestige 5.', condition: value => value.prestige >= 5 },
  { id: 'prestige-10', icon: '⭐', title: 'Prestige-Profi', description: 'Erreiche Prestige 10.', condition: value => value.prestige >= 10 },
  { id: 'prestige-25', icon: '🌌', title: 'Dimensionsreisender', description: 'Erreiche Prestige 25.', condition: value => value.prestige >= 25 },
  { id: 'prestige-50', icon: '🏆', title: 'Prestige-Legende', description: 'Erreiche Prestige 50.', condition: value => value.prestige >= 50 }
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
