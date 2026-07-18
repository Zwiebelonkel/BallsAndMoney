import { Component } from '@angular/core';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  template: `
    <button class="setting-btn" id="btn-admin-toggle" type="button" aria-expanded="false" aria-controls="admin-panel">
      Admin Panel
      <span class="setting-value">Code erforderlich</span>
    </button>

    <div class="slide-panel" id="admin-panel" aria-hidden="true">
      <div class="slide-panel-card">
        <div class="slide-panel-header">
          <div>
            <div class="slide-panel-title">Admin Panel</div>
            <div class="slide-panel-copy">Gib den Admin-Code ein, um Spezialaktionen freizuschalten.</div>
          </div>
          <button class="panel-close" id="btn-admin-close" type="button" aria-label="Admin Panel schließen">×</button>
        </div>

        <div class="admin-code-box" id="admin-code-box">
          <label class="admin-label" for="admin-code-input">Admin-Code</label>
          <input class="admin-input" id="admin-code-input" type="password" inputmode="numeric" autocomplete="off" placeholder="Code eingeben" aria-describedby="admin-code-message">
          <button class="setting-btn" id="btn-admin-unlock" type="button">
            Panel freischalten
            <span class="setting-value">Code prüfen</span>
          </button>
          <div class="admin-message" id="admin-code-message" role="status">Code erforderlich.</div>
        </div>

        <div class="admin-actions" id="admin-actions" hidden>
          <div class="prestige-details">
            <div>Status: <strong>Freigeschaltet</strong></div>
            <div>Aktion: <strong>+1.000.000 🪙</strong></div>
          </div>

          <button class="upgrade-btn can-afford" id="btn-admin-money" type="button">
            <div class="btn-name">1 Mio Geld geben</div>
            <div class="btn-desc">Fügt deinem Spielstand sofort 1.000.000 Münzen hinzu</div>
            <div class="btn-cost">Admin Aktion</div>
          </button>

          <button class="upgrade-btn can-afford" id="btn-admin-free-upgrades" type="button" aria-pressed="false">
            <div class="btn-name">Kostenlose Upgrades</div>
            <div class="btn-desc">Jedes Shop-Upgrade kann kostenlos gekauft werden</div>
            <div class="btn-cost" id="admin-free-upgrades-status">Deaktiviert</div>
          </button>
        </div>
      </div>
    </div>
  `
})
export class AdminPanelComponent {}
