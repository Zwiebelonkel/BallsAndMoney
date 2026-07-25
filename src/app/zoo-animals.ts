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
  { id: 'king-capibara', name: 'König Capybara', emoji: '🦥', rarity: 'Legendär', cost: 30, coinsPerSecond: 1000, description: 'Regiert gelassen vom Orangen-Thron.' },
  { id: 'ninja-cat', name: 'Ninja-Katze', emoji: '🐈', rarity: 'Gewöhnlich', cost: 3, coinsPerSecond: 20, description: 'Schleicht lautlos an jedem Sparschwein vorbei.' },
  { id: 'baker-pig', name: 'Bäcker-Schwein', emoji: '🐖', rarity: 'Gewöhnlich', cost: 5, coinsPerSecond: 45, description: 'Backt goldbraune Glückskekse im Akkord.' },
  { id: 'pirate-parrot', name: 'Piraten-Papagei', emoji: '🦜', rarity: 'Selten', cost: 8, coinsPerSecond: 95, description: 'Kennt die Koordinaten jeder Schatztruhe.' },
  { id: 'detective-fox', name: 'Detektiv-Fuchs', emoji: '🦊', rarity: 'Selten', cost: 12, coinsPerSecond: 190, description: 'Findet selbst die letzte verlorene Münze.' },
  { id: 'samurai-shiba', name: 'Samurai-Shiba', emoji: '🐕', rarity: 'Episch', cost: 18, coinsPerSecond: 390, description: 'Zerteilt Rechnungen mit einem einzigen Hieb.' },
  { id: 'cyber-penguin', name: 'Cyber-Pinguin', emoji: '🐧', rarity: 'Episch', cost: 27, coinsPerSecond: 800, description: 'Hackt sich direkt in den Fischmarkt.' },
  { id: 'oracle-owl', name: 'Orakel-Eule', emoji: '🦉', rarity: 'Episch', cost: 38, coinsPerSecond: 1500, description: 'Sagt den nächsten Münzregen präzise voraus.' },
  { id: 'thunder-lion', name: 'Donner-Löwe', emoji: '🦁', rarity: 'Legendär', cost: 55, coinsPerSecond: 2800, description: 'Sein Brüllen lässt Gold vom Himmel regnen.' },
  { id: 'time-turtle', name: 'Zeitreise-Schildkröte', emoji: '🐢', rarity: 'Legendär', cost: 75, coinsPerSecond: 5000, description: 'Verdient schon heute die Münzen von morgen.' },
  { id: 'galaxy-giraffe', name: 'Galaxie-Giraffe', emoji: '🦒', rarity: 'Legendär', cost: 100, coinsPerSecond: 9000, description: 'Ihr Kopf reicht bis zu den reichsten Sternen.' }
];
