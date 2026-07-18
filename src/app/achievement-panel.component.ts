import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, timer } from 'rxjs';
import { Achievement, AchievementService } from './achievement.service';

@Component({
  selector: 'app-achievement-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="section-label">Erfolge</div>
    <button class="upgrade-btn" id="btn-achievements" type="button" aria-expanded="false" aria-controls="achievement-panel">
      <div class="btn-name">Achievements</div>
      <div class="btn-desc">Alle globalen Erfolge ansehen</div>
      <div class="btn-cost">{{ unlockedCount }}/{{ achievements.length }} freigeschaltet</div>
    </button>

    <div class="slide-panel" id="achievement-panel" aria-hidden="true">
      <div class="slide-panel-card achievement-panel-card">
        <div class="slide-panel-header">
          <div>
            <div class="slide-panel-title">Globale Erfolge</div>
            <div class="slide-panel-copy">Einmal freigeschaltete Erfolge bleiben auch nach einem Prestige erhalten.</div>
          </div>
          <button class="panel-close" id="btn-achievements-close" type="button" aria-label="Erfolge schließen">×</button>
        </div>
        <div class="achievement-list">
          <article class="achievement-row" *ngFor="let achievement of achievements" [class.is-unlocked]="achievement.unlocked">
            <span class="achievement-icon">{{ achievement.unlocked ? achievement.icon : '🔒' }}</span>
            <div><div class="achievement-title">{{ achievement.title }}</div><div class="achievement-copy">{{ achievement.description }}</div></div>
            <span class="achievement-state">{{ achievement.unlocked ? 'Erreicht' : 'Offen' }}</span>
          </article>
        </div>
      </div>
    </div>

    <div class="achievement-toast" *ngIf="toast" role="status" aria-live="polite">
      <span class="achievement-toast-icon">{{ toast.icon }}</span>
      <div><strong>Erfolg freigeschaltet</strong><span>{{ toast.title }}</span></div>
    </div>
  `
})
export class AchievementPanelComponent implements OnDestroy {
  achievements: Achievement[] = [];
  toast: Achievement | null = null;
  private toastSubscription?: Subscription;
  private readonly subscriptions = new Subscription();

  constructor(private readonly achievementService: AchievementService) {
    this.subscriptions.add(this.achievementService.achievements$.subscribe(value => this.achievements = value));
    this.subscriptions.add(this.achievementService.unlocked$.subscribe(achievement => this.showToast(achievement)));
  }

  get unlockedCount(): number {
    return this.achievements.filter(achievement => achievement.unlocked).length;
  }

  ngOnDestroy(): void {
    this.toastSubscription?.unsubscribe();
    this.subscriptions.unsubscribe();
  }

  private showToast(achievement: Achievement): void {
    this.toast = achievement;
    this.toastSubscription?.unsubscribe();
    this.toastSubscription = timer(3500).subscribe(() => this.toast = null);
  }
}
