import { Component } from '@angular/core';

@Component({
  selector: 'app-balls-panel',
  standalone: true,
  template: `
    <div class="section-label">Balls</div>

    <button class="setting-btn" id="btn-balls-toggle" type="button" aria-expanded="false" aria-controls="balls-panel">
      Balls
      <span class="setting-value" id="balls-toggle-value">0 Kugeln</span>
    </button>

    <div class="slide-panel" id="balls-panel" aria-hidden="true">
      <div class="slide-panel-card balls-panel-card">
        <div class="slide-panel-header">
          <div>
            <div class="slide-panel-title">Balls</div>
            <div class="slide-panel-copy">Alle Kugeln mit Nummer, Größe, Farbe, Kollisionen und Aktiv-Status.</div>
          </div>
          <button class="panel-close" id="btn-balls-close" type="button" aria-label="Balls schließen">×</button>
        </div>

        <div class="balls-summary" id="balls-summary">Keine Kugeln vorhanden.</div>
        <div class="balls-list" id="balls-list" role="list" aria-live="polite"></div>
      </div>
    </div>
  `
})
export class BallsPanelComponent {}
