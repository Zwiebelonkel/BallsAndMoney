import { Component } from '@angular/core';
import { AdminPanelComponent } from './admin-panel.component';

@Component({
  selector: 'app-settings-panel',
  standalone: true,
  imports: [AdminPanelComponent],
  template: `
    <div class="section-label">Anzeige</div>

    <button class="setting-btn" id="btn-settings-toggle" type="button" aria-expanded="false" aria-controls="settings-panel">
      Anzeige öffnen
      <span class="setting-value">Settings</span>
    </button>

    <div class="slide-panel" id="settings-panel" aria-hidden="true">
      <div class="slide-panel-card">
        <div class="slide-panel-header">
          <div>
            <div class="slide-panel-title">Anzeige</div>
            <div class="slide-panel-copy">Passe Darstellung, Graphen und Spielstand an.</div>
          </div>
          <button class="panel-close" id="btn-settings-close" type="button" aria-label="Anzeige schließen">×</button>
        </div>

        <button class="setting-btn" id="btn-theme" type="button">
          Theme wechseln
          <span class="setting-value" id="theme-val">Dark</span>
        </button>

        <button class="setting-btn" id="btn-color-mode" type="button">
          Farbmodus wechseln
          <span class="setting-value" id="color-mode-val">Farben aktiv</span>
        </button>

        <button class="setting-btn" id="btn-graph" type="button">
          Graph umschalten
          <span class="setting-value" id="graph-val">Sichtbar</span>
        </button>

        <app-admin-panel></app-admin-panel>

        <button class="setting-btn danger" id="btn-reset" type="button">
          Spielstand zurücksetzen
          <span class="setting-value">Reset</span>
        </button>
      </div>
    </div>
  `
})
export class SettingsPanelComponent {}
