import { Component } from '@angular/core';
import { ZOO_ANIMALS } from './zoo-animals';

@Component({
  selector: 'app-zoo-panel',
  standalone: true,
  template: `
    <div class="section-label">Zoo</div>
    <button class="upgrade-btn zoo-open-button" id="btn-zoo" type="button" aria-expanded="false" aria-controls="zoo-panel">
      <div class="btn-name">🌿 Zoo</div>
      <div class="btn-desc">Permanente Tiere und passives Einkommen</div>
      <div class="btn-cost" id="zoo-shop-summary">0 Tiere · 0 🪙/s</div>
    </button>

    <div class="slide-panel zoo-page" id="zoo-panel" aria-hidden="true">
      <div class="slide-panel-card zoo-card">
        <div class="slide-panel-header">
          <div>
            <div class="slide-panel-title">🌿 Dein verrückter Zoo</div>
            <div class="slide-panel-copy">Tiere bleiben auch nach einem Prestige bei dir und verdienen permanent Geld.</div>
          </div>
          <button class="panel-close" id="btn-zoo-close" type="button" aria-label="Zoo schließen">×</button>
        </div>
        <div class="zoo-wallet">
          <span>Prestige-Credits <strong id="zoo-credits">0</strong> 🎟️</span>
          <span>Zoo-Einkommen <strong id="zoo-income">0</strong> 🪙/s</span>
        </div>
        <div class="zoo-grid" id="zoo-list">
          @for (animal of animals; track animal.id) {
            <article class="zoo-animal" [attr.data-rarity]="animal.rarity">
              <div class="zoo-animal-emoji">{{ animal.emoji }}</div>
              <div class="zoo-animal-body">
                <div class="zoo-animal-heading"><strong>{{ animal.name }}</strong><span>{{ animal.rarity }}</span></div>
                <p>{{ animal.description }}</p>
                <div class="zoo-animal-income">+{{ animal.coinsPerSecond }} 🪙/s</div>
              </div>
              <button class="zoo-buy" type="button" [attr.data-animal-id]="animal.id">{{ animal.cost }} 🎟️</button>
            </article>
          }
        </div>
      </div>
    </div>
  `
})
export class ZooPanelComponent {
  readonly animals = ZOO_ANIMALS;
}
