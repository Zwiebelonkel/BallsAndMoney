import { Component } from '@angular/core';

@Component({
  selector: 'app-prestige-panel',
  standalone: true,
  template: `
    <div class="section-label">Prestige</div>

    <button class="upgrade-btn" id="btn-prestige" type="button" aria-expanded="false" aria-controls="prestige-panel">
      <div class="btn-name">Prestige</div>
      <div class="btn-desc">Öffnet Erklärung und Bestätigung</div>
      <div class="btn-cost" id="cost-prestige">2.500.000 🪙</div>
    </button>

    <div class="slide-panel" id="prestige-panel" aria-hidden="true">
      <div class="slide-panel-card">
        <div class="slide-panel-header">
          <div>
            <div class="slide-panel-title">Prestige bestätigen</div>
            <div class="slide-panel-copy">
              Prestige setzt Münzen, Kugeln und Upgrades zurück. Dein globaler Geld-Multiplikator steigt dafür permanent.
            </div>
          </div>
          <button class="panel-close" id="btn-prestige-close" type="button" aria-label="Prestige schließen">×</button>
        </div>

        <div class="prestige-details">
          <div>Aktueller Bonus: <strong id="prestige-current-mult">Global x1</strong></div>
          <div>Nach Prestige: <strong id="prestige-next-mult">Global x1.35</strong></div>
          <div>Kosten: <strong id="prestige-panel-cost">2.500.000 🪙</strong></div>
        </div>

        <button class="upgrade-btn danger" id="btn-prestige-confirm" type="button">
          <div class="btn-name">Prestige jetzt durchführen</div>
          <div class="btn-desc">Run zurücksetzen und permanenten Bonus erhalten</div>
        </button>
      </div>
    </div>
  `
})
export class PrestigePanelComponent {}
