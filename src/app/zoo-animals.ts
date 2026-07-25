export type ZooRarity = 'Gewöhnlich' | 'Selten' | 'Episch' | 'Legendär';

export interface ZooAnimal {
  id: string;
  name: string;
  emoji: string;
  rarity: ZooRarity;
  cost: number;
  coinsPerSecond: number;
  description: string;
}

/** The complete zoo catalogue. Add future animals here, not in the UI. */
export const ZOO_ANIMALS: readonly ZooAnimal[] = [
  { id: 'pancake-panda', name: 'Pfannkuchen-Panda', emoji: '🐼', rarity: 'Gewöhnlich', cost: 1, coinsPerSecond: 5, description: 'Stapelt Snacks schneller als Bambus.' },
  { id: 'disco-duck', name: 'Disco-Ente', emoji: '🦆', rarity: 'Gewöhnlich', cost: 2, coinsPerSecond: 12, description: 'Watschelt immer genau im Takt.' },
  { id: 'business-otter', name: 'Business-Otter', emoji: '🦦', rarity: 'Selten', cost: 4, coinsPerSecond: 35, description: 'Hat für jede Muschel eine Quittung.' },
  { id: 'astronaut-axolotl', name: 'Astro-Axolotl', emoji: '🐸', rarity: 'Selten', cost: 6, coinsPerSecond: 65, description: 'Schwebt gedanklich schon im All.' },
  { id: 'wizard-raccoon', name: 'Zauber-Waschbär', emoji: '🦝', rarity: 'Episch', cost: 10, coinsPerSecond: 150, description: 'Verwandelt Müll in Kleingeld.' },
  { id: 'unicorn-whale', name: 'Einhorn-Wal', emoji: '🐳', rarity: 'Episch', cost: 14, coinsPerSecond: 275, description: 'Glitzert auch unter Wasser.' },
  { id: 'dragon-hamster', name: 'Drachen-Hamster', emoji: '🐹', rarity: 'Legendär', cost: 22, coinsPerSecond: 600, description: 'Bewacht einen Hort aus Sonnenblumenkernen.' },
  { id: 'king-capibara', name: 'König Capybara', emoji: '🦥', rarity: 'Legendär', cost: 30, coinsPerSecond: 1000, description: 'Regiert gelassen vom Orangen-Thron.' }
];
