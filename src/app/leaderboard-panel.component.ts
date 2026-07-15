import { Component } from '@angular/core';

@Component({
  selector: 'app-leaderboard-panel',
  standalone: true,
  template: `
    <div class="section-label">Leaderboard</div>

    <button class="upgrade-btn" id="btn-leaderboard" type="button" aria-expanded="false" aria-controls="leaderboard-panel">
      <div class="btn-name">Leaderboard</div>
      <div class="btn-desc">Anmelden, Score senden und Top-Spieler sehen</div>
      <div class="btn-cost" id="leaderboard-status">Nicht angemeldet</div>
    </button>

    <div class="slide-panel" id="leaderboard-panel" aria-hidden="true">
      <div class="slide-panel-card leaderboard-panel-card">
        <div class="slide-panel-header">
          <div>
            <div class="slide-panel-title">Leaderboard</div>
            <div class="slide-panel-copy">
              Ranking nach Prestige, Geld und Bällen. Dein aktueller Spielstand kann nach der Anmeldung übertragen werden.
            </div>
          </div>
          <button class="panel-close" id="btn-leaderboard-close" type="button" aria-label="Leaderboard schließen">×</button>
        </div>

        <div class="leaderboard-login" id="leaderboard-login">
          <label class="leaderboard-label" for="leaderboard-name-input">Spielername</label>
          <div class="leaderboard-login-row">
            <input class="leaderboard-input" id="leaderboard-name-input" type="text" maxlength="24" autocomplete="nickname" placeholder="Dein Name">
            <button class="ball-toggle" id="btn-leaderboard-login" type="button">Anmelden</button>
          </div>
        </div>

        <div class="leaderboard-profile" id="leaderboard-profile" hidden>
          <div>Angemeldet als <strong id="leaderboard-player-name">-</strong></div>
          <button class="ball-toggle" id="btn-leaderboard-logout" type="button">Abmelden</button>
        </div>

        <div class="leaderboard-actions">
          <button class="upgrade-btn can-afford" id="btn-leaderboard-submit" type="button">
            <div class="btn-name">Score senden</div>
            <div class="btn-desc" id="leaderboard-current-score">Prestige 0 · 0 🪙 · 0 Kugeln</div>
          </button>
          <button class="setting-btn" id="btn-leaderboard-refresh" type="button">
            Leaderboard aktualisieren
            <span class="setting-value">Top 25 laden</span>
          </button>
        </div>

        <div class="leaderboard-message" id="leaderboard-message">Melde dich an, um deinen Score zu senden.</div>

        <div class="leaderboard-list" id="leaderboard-list" aria-live="polite"></div>
      </div>
    </div>
  `
})
export class LeaderboardPanelComponent {}
