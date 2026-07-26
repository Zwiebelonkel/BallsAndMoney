import { Component } from '@angular/core';

@Component({
  selector: 'app-leaderboard-panel',
  standalone: true,
  template: `
    <div class="section-label">Leaderboard</div>

    <button class="upgrade-btn" id="btn-leaderboard" type="button" aria-expanded="false" aria-controls="leaderboard-panel">
      <div class="btn-name">Leaderboard</div>
      <div class="btn-desc">Account erstellen, anmelden und Top-Spieler sehen</div>
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
          <div class="leaderboard-auth-tabs" role="tablist" aria-label="Account-Zugang">
            <button class="ball-toggle is-active" id="btn-auth-login-tab" type="button">Login</button>
            <button class="ball-toggle" id="btn-auth-register-tab" type="button">Registrieren</button>
          </div>
          <label class="leaderboard-label" for="leaderboard-name-input">Username</label>
          <input class="leaderboard-input" id="leaderboard-name-input" type="text" minlength="2" maxlength="24" autocomplete="username" placeholder="Dein Username">
          <label class="leaderboard-label" for="leaderboard-password-input">Passwort</label>
          <input class="leaderboard-input" id="leaderboard-password-input" type="password" minlength="8" maxlength="128" autocomplete="current-password" placeholder="Mindestens 8 Zeichen">
          <fieldset class="emoji-picker" id="leaderboard-emoji-picker" hidden>
            <legend>Profilbild auswählen</legend>
            <div class="emoji-options">
              <label><input type="radio" name="profile-emoji" value="🙂" checked><span>🙂</span></label>
              <label><input type="radio" name="profile-emoji" value="😎"><span>😎</span></label>
              <label><input type="radio" name="profile-emoji" value="🤩"><span>🤩</span></label>
              <label><input type="radio" name="profile-emoji" value="🥳"><span>🥳</span></label>
              <label><input type="radio" name="profile-emoji" value="🤖"><span>🤖</span></label>
              <label><input type="radio" name="profile-emoji" value="👾"><span>👾</span></label>
              <label><input type="radio" name="profile-emoji" value="🐸"><span>🐸</span></label>
              <label><input type="radio" name="profile-emoji" value="🦊"><span>🦊</span></label>
              <label><input type="radio" name="profile-emoji" value="🐼"><span>🐼</span></label>
              <label><input type="radio" name="profile-emoji" value="🐵"><span>🐵</span></label>
              <label><input type="radio" name="profile-emoji" value="🦁"><span>🦁</span></label>
              <label><input type="radio" name="profile-emoji" value="🐯"><span>🐯</span></label>
            </div>
          </fieldset>
          <button class="ball-toggle leaderboard-auth-submit" id="btn-leaderboard-login" type="button">Anmelden</button>
        </div>

        <div class="leaderboard-profile" id="leaderboard-profile" hidden>
          <div><span class="leaderboard-profile-emoji" id="leaderboard-player-emoji">🙂</span> Angemeldet als <strong id="leaderboard-player-name">-</strong></div>
          <button class="ball-toggle" id="btn-leaderboard-logout" type="button">Abmelden</button>
        </div>

        <div class="leaderboard-message" id="leaderboard-message">Melde dich an, um deinen Score zu synchronisieren.</div>

        <div class="leaderboard-list" id="leaderboard-list" aria-live="polite"></div>
      </div>
    </div>
  `
})
export class LeaderboardPanelComponent {}
