import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import { PrestigePanelComponent } from './prestige-panel.component';
import { SettingsPanelComponent } from './settings-panel.component';
import { BallsPanelComponent } from './balls-panel.component';
import { LeaderboardPanelComponent } from './leaderboard-panel.component';
import { AchievementPanelComponent } from './achievement-panel.component';
import { AchievementService } from './achievement.service';
import { GameStorageService } from './game-storage.service';
import { DEFAULT_GAME_PARAMETERS, cloneGameParameters } from './game-parameters';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [PrestigePanelComponent, SettingsPanelComponent, BallsPanelComponent, LeaderboardPanelComponent, AchievementPanelComponent],
  templateUrl: './app.component.html'
})
export class AppComponent implements AfterViewInit, OnDestroy {
  private cleanupCallbacks: Array<() => void> = [];

  constructor(
    private readonly storage: GameStorageService,
    private readonly achievementService: AchievementService
  ) {}

  ngAfterViewInit(): void {
    this.startGame();
  }

  ngOnDestroy(): void {
    for (const cleanup of this.cleanupCallbacks) {
      cleanup();
    }
  }

  private startGame(): void {
    const storage = this.storage;
    const achievementService = this.achievementService;
    const getElementById = <T extends HTMLElement>(id: string): T =>
      document.getElementById(id) as T;

    const canvas = getElementById<HTMLCanvasElement>('c');
    const ctx = canvas.getContext('2d');
    const wrap = getElementById<HTMLElement>('canvas-wrap');

    let W = 0;
    let H = 0;
    let objects = [];
    let replacementBalls = [];
    let ballsPanelDirty = true;
    let lastBallsPanelRender = 0;

    const parameters = cloneGameParameters();
    const activeFloatTexts = [];

    function setInitialCanvasSize(){
      if(window.matchMedia('(max-width: 720px)').matches){
        const viewportWidth = Math.max(1, Math.round(window.innerWidth));
        document.documentElement.style.setProperty(
          '--mobile-canvas-size',
          `${viewportWidth}px`
        );
      }

      const rect = wrap.getBoundingClientRect();

      W = Math.max(1, Math.round(rect.width || wrap.clientWidth));
      H = Math.max(1, Math.round(rect.height || wrap.clientHeight));

      const devicePixelRatio = Math.min(
        window.devicePixelRatio || 1,
        parameters.physics.maxDevicePixelRatio
      );

      canvas.width = Math.round(W * devicePixelRatio);
      canvas.height = Math.round(H * devicePixelRatio);
      ctx.setTransform(
        devicePixelRatio,
        0,
        0,
        devicePixelRatio,
        0,
        0
      );
    }

    setInitialCanvasSize();


    function blockBrowserZoom(){
      const block = event => {
        event.preventDefault();
      };

      window.addEventListener('gesturestart', block, { passive: false });
      window.addEventListener('gesturechange', block, { passive: false });
      window.addEventListener('gestureend', block, { passive: false });

      window.addEventListener('wheel', event => {
        if(event.ctrlKey || event.metaKey){
          event.preventDefault();
        }
      }, { passive: false });

      window.addEventListener('keydown', event => {
        const key = event.key;

        if(
          (event.ctrlKey || event.metaKey) &&
          (key === '+' || key === '-' || key === '=' || key === '0')
        ){
          event.preventDefault();
        }
      });
    }

    blockBrowserZoom();

    const preferences = {
      theme: 'dark',
      colorMode: 'color',
      graphVisible: true,
      ballTrailsVisible: true,
      moneyPopupsVisible: true
    };

    const COLORS = [
      '#4a8fd4',
      '#1D9E75',
      '#D85A30',
      '#D4537E',
      '#FAC775',
      '#9FE1CB',
      '#b388ff',
      '#5DCAA5',
      '#f48fb1',
      '#80cbc4'
    ];

    let hueIdx = 0;

    function getCanvasPoint(event){
      const rect = canvas.getBoundingClientRect();

      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
    }

    function cssVar(name){
      return getComputedStyle(document.body).getPropertyValue(name).trim();
    }

    function getMonoInkColor(){
      return preferences.theme === 'light' ? '#000000' : '#ffffff';
    }

    function getMonoSoftColor(alpha){
      const channel = preferences.theme === 'light' ? '0,0,0' : '255,255,255';

      return `rgba(${channel},${alpha})`;
    }

    function displayColor(color){
      return preferences.colorMode === 'mono' ? getMonoInkColor() : color;
    }

    function applyPreferences(){
      document.body.classList.toggle('theme-light', preferences.theme === 'light');
      document.body.classList.toggle('graph-hidden', !preferences.graphVisible);
      document.body.classList.toggle('mono-mode', preferences.colorMode === 'mono');
      document.getElementById('theme-val').textContent = preferences.theme === 'light' ? 'Light' : 'Dark';
      document.getElementById('color-mode-val').textContent = preferences.colorMode === 'mono' ? 'Schwarz-Weiß' : 'Farben aktiv';
      document.getElementById('graph-val').textContent = preferences.graphVisible ? 'Sichtbar' : 'Ausgeblendet';
      document.getElementById('ball-trails-val').textContent = preferences.ballTrailsVisible ? 'Aktiv' : 'Aus';
      document.getElementById('money-popups-val').textContent = preferences.moneyPopupsVisible ? 'Aktiv' : 'Aus';

      if(!preferences.ballTrailsVisible){
        for(const ball of objects){
          ball.trail = [];
        }
      }

      if(!preferences.moneyPopupsVisible){
        clearFloatTexts();
      }
    }

    const state = {
      coins: 0,
      colPerSec: 0,
      moneyPerSec: 0,
      lastColT: performance.now(),
      colCount: 0,
      moneyCount: 0,
      prestige: 0,
      prestigeBonus: 0,
      comboCount: 0,
      lastComboT: 0
    };

    const upgradeConfig = parameters.upgrades;

    const upgrades = {
      size: 0,
      mult: 0,
      cap: 0,
      combo: 0,
      launch: 0,
      border: 0
    };
    let adminFreeUpgrades = false;

    function getCost(key, level){
      const config = upgradeConfig[key];

      if(config === undefined){
        console.error(`Kein Preis für Upgrade "${key}" definiert.`);
        return Infinity;
      }

      if(Number.isFinite(config.maxLevel) && level >= config.maxLevel){
        return Infinity;
      }

      const tierPenalty = Number.isFinite(config.tierGrowthStart)
        ? Math.pow(config.tierGrowth, Math.max(0, level - config.tierGrowthStart + 1))
        : 1;

      return Math.round(
        config.baseCost * Math.pow(config.growth, level) * tierPenalty
      );
    }

    function getArenaScale(ballCount = objects.length){
      return 1 + Math.floor(ballCount / parameters.balls.arenaScaleBallsPerTier) * parameters.balls.arenaScalePerTier;
    }

    function getBaseR(ballCount = objects.length){
      return (parameters.balls.baseRadius + upgrades.size * parameters.balls.radiusPerSizeUpgrade) / getArenaScale(ballCount);
    }

    function getRandomRadiusMultiplier(){
      return parameters.balls.randomRadiusMin + Math.random() * (parameters.balls.randomRadiusMax - parameters.balls.randomRadiusMin);
    }

    function resizeBallsToCurrentArena(){
      for(const ball of objects){
        ball.r = getBaseR() * getRandomRadiusMultiplier();
        ball.m = ball.r * ball.r * parameters.balls.massFactor;
        ball.x = Math.max(ball.r, Math.min(W - ball.r, ball.x));
        ball.y = Math.max(ball.r, Math.min(H - ball.r, ball.y));
        ball.trail = [];
      }
    }


    function getPrestigeOverflowBonus(){
      const prestigeCost = getPrestigeCost();
      const overflowSteps = Math.floor(
        Math.max(0, (state.coins || 0) - prestigeCost) / parameters.prestige.overflowStep
      );

      return Math.min(
        parameters.prestige.overflowMaxBonus,
        overflowSteps * parameters.prestige.overflowBonus
      );
    }

    function getGlobalMoneyMult(){
      return 1 + (state.prestige || 0) * parameters.prestige.baseMultiplierBonus + (state.prestigeBonus || 0);
    }

    function getStarterMoneyMult(){
      return state.colCount < parameters.rewards.starterCollisionCount ? parameters.rewards.starterCollisionBonus : 1;
    }

    function getCoinMult(){
      return (1 + upgrades.mult * parameters.rewards.multiplierPerUpgrade) * getGlobalMoneyMult() * getStarterMoneyMult();
    }

    function getMaxBalls(){
      return parameters.balls.baseCapacity + upgrades.cap;
    }

    function getComboLevel(){
      return upgrades.combo;
    }

    function getLaunchPowerMultiplier(){
      return parameters.balls.baseLaunchMultiplier * Math.pow(parameters.balls.launchGrowth, upgrades.launch);
    }

    const BORDER_SIDES = [
      { key: 'top', color: '#FAC775' },
      { key: 'right', color: '#9FE1CB' },
      { key: 'bottom', color: '#D4537E' },
      { key: 'left', color: '#4a8fd4' }
    ];

    function isBorderSideActive(side){
      return BORDER_SIDES
        .slice(0, upgrades.border)
        .some(borderSide => borderSide.key === side);
    }

    let objectIndex = 0;
    let saveTimer = 0;

    function getSaveData(){
      return {
        version: 1,
        state: {
          coins: state.coins,
          prestige: state.prestige || 0,
          prestigeBonus: state.prestigeBonus || 0
        },
        upgrades: { ...upgrades },
        preferences: { ...preferences },
        parameters: JSON.parse(JSON.stringify(parameters)),
        arena: {
          w: W,
          h: H
        },
        hueIdx,
        objectIndex,
        replacementBalls: replacementBalls.map(ball => ({
          id: ball.id,
          r: ball.r,
          m: ball.m,
          col: ball.col,
          maxSpeed: ball.maxSpeed,
          collisions: Number.isFinite(ball.collisions) ? ball.collisions : 0,
          imageSrc: typeof ball.imageSrc === 'string' ? ball.imageSrc : ''
        })),
        objects: objects.map(ball => ({
          id: ball.id,
          x: ball.x,
          y: ball.y,
          vx: ball.vx,
          vy: ball.vy,
          r: ball.r,
          m: ball.m,
          col: ball.col,
          active: ball.active !== false,
          maxSpeed: Number.isFinite(ball.maxSpeed) ? ball.maxSpeed : Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy),
          collisions: Number.isFinite(ball.collisions) ? ball.collisions : 0,
          imageSrc: typeof ball.imageSrc === 'string' ? ball.imageSrc : ''
        }))
      };
    }

    function saveGame(){
      storage.save(getSaveData());
    }

    function queueSave(){
      clearTimeout(saveTimer);

      saveTimer = setTimeout(saveGame, parameters.ui.saveDebounceMs);
    }


    function mergeParameters(target, source){
      for(const key of Object.keys(source || {})){
        if(!(key in target)){
          continue;
        }

        if(source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])){
          mergeParameters(target[key], source[key]);
          continue;
        }

        if(Number.isFinite(source[key])){
          target[key] = source[key];
        }
      }
    }

    function resetParameters(){
      mergeParameters(parameters, DEFAULT_GAME_PARAMETERS);
      resizeBallsToCurrentArena();
      updateHintMsg();
      updateUI();
      renderAdminParameters();
      saveGame();
    }

    function loadGame(){
      const data = storage.load<any>();

      if(!data){
        return false;
      }

      try{
        if(data.parameters){
          mergeParameters(parameters, data.parameters);
        }

        if(data.state && Number.isFinite(data.state.coins)){
          state.coins = data.state.coins;
        }

        if(data.state && Number.isFinite(data.state.prestige)){
          state.prestige = data.state.prestige;
        }

        if(data.state && Number.isFinite(data.state.prestigeBonus)){
          state.prestigeBonus = data.state.prestigeBonus;
        }

        if(data.upgrades){
          for(const key of Object.keys(upgrades)){
            if(Number.isFinite(data.upgrades[key])){
              upgrades[key] = data.upgrades[key];
            }
          }
        }

        if(data.preferences){
          Object.assign(preferences, data.preferences);
        }

        const savedArenaW = Number.isFinite(data.arena?.w) ? data.arena.w : W;
        const savedArenaH = Number.isFinite(data.arena?.h) ? data.arena.h : H;
        const savedArenaScaleX = W / Math.max(1, savedArenaW);
        const savedArenaScaleY = H / Math.max(1, savedArenaH);

        hueIdx = Number.isFinite(data.hueIdx) ? data.hueIdx : hueIdx;
        objectIndex = Number.isFinite(data.objectIndex) ? data.objectIndex : objectIndex;

        if(Array.isArray(data.objects)){
          objects = data.objects
            .filter(ball => Number.isFinite(ball.x) && Number.isFinite(ball.y))
            .map(ball => ({
              id: Number.isFinite(ball.id) ? ball.id : objectIndex++,
              x: ball.x * savedArenaScaleX,
              y: ball.y * savedArenaScaleY,
              vx: Number.isFinite(ball.vx) ? ball.vx : 0,
              vy: Number.isFinite(ball.vy) ? ball.vy : 0,
              r: Number.isFinite(ball.r) ? ball.r : getBaseR(),
              m: Number.isFinite(ball.m) ? ball.m : getBaseR() * getBaseR() * parameters.balls.massFactor,
              col: ball.col || COLORS[hueIdx % COLORS.length],
              active: ball.active !== false,
              collisions: Number.isFinite(ball.collisions) ? ball.collisions : 0,
              imageSrc: typeof ball.imageSrc === 'string' ? ball.imageSrc : '',
              maxSpeed: Number.isFinite(ball.maxSpeed) ? ball.maxSpeed : Math.sqrt((Number.isFinite(ball.vx) ? ball.vx : 0) ** 2 + (Number.isFinite(ball.vy) ? ball.vy : 0) ** 2),
              image: null,
              trail: []
            }));

          for(const ball of objects){
            ball.x = Math.max(ball.r, Math.min(W - ball.r, ball.x));
            ball.y = Math.max(ball.r, Math.min(H - ball.r, ball.y));
          }
        }


        if(Array.isArray(data.replacementBalls)){
          replacementBalls = data.replacementBalls
            .filter(ball => Number.isFinite(ball.r))
            .map(ball => ({
              id: Number.isFinite(ball.id) ? ball.id : objectIndex++,
              r: ball.r,
              m: Number.isFinite(ball.m) ? ball.m : ball.r * ball.r * parameters.balls.massFactor,
              col: ball.col || COLORS[hueIdx % COLORS.length],
              maxSpeed: Number.isFinite(ball.maxSpeed) ? ball.maxSpeed : 0,
              collisions: Number.isFinite(ball.collisions) ? ball.collisions : 0,
              imageSrc: typeof ball.imageSrc === 'string' ? ball.imageSrc : '',
              image: null
            }));
        }

        const inactiveLoadedBalls = objects.filter(ball => ball.active === false);

        if(inactiveLoadedBalls.length > 0){
          replacementBalls.push(...inactiveLoadedBalls.map(createReplacementBall));
          objects = objects.filter(ball => ball.active !== false);
          ballsPanelDirty = true;
        }

        return true;
      } catch(error){
        console.error('Spielstand konnte nicht geladen werden.', error);
        storage.clear();
        return false;
      }
    }


    const PARAMETER_GROUP_LABELS = {
      upgrades: 'Upgrade-Kosten',
      balls: 'Kugeln & Launch',
      rewards: 'Rewards & Combo',
      prestige: 'Prestige',
      physics: 'Physik',
      ui: 'UI & Timing',
      admin: 'Admin'
    };

    const PARAMETER_LABELS = {
      baseCost: 'Basis-Kosten', growth: 'Kosten-Wachstum', tierGrowthStart: 'Tier-Wachstum ab Level', tierGrowth: 'Tier-Wachstum', maxLevel: 'Max. Level',
      baseCapacity: 'Basis-Kapazität', baseRadius: 'Basis-Radius', radiusPerSizeUpgrade: 'Radius pro Größe-Level', randomRadiusMin: 'Radius-Zufall min.', randomRadiusMax: 'Radius-Zufall max.', massFactor: 'Masse-Faktor', arenaScaleBallsPerTier: 'Arena-Skalierung alle Kugeln', arenaScalePerTier: 'Arena-Skalierung pro Tier', baseLaunchMultiplier: 'Launch-Basis', launchGrowth: 'Launch-Wachstum', randomShotMinSpeed: 'Zufallsschuss min.', randomShotSpeedRange: 'Zufallsschuss Spannweite', aimedShotMaxSpeed: 'Gezielter Schuss max.', maxDrag: 'Max. Drag', tapShotThreshold: 'Tap-Schwelle', trailLength: 'Trail-Länge',
      multiplierPerUpgrade: 'Multiplikator je Level', starterCollisionCount: 'Starter-Kollisionen', starterCollisionBonus: 'Starter-Bonus', borderCollisionValue: 'Border-Wert', comboWindowMs: 'Combo-Fenster (ms)', comboBaseMax: 'Combo-Max Basis', comboBonusScale: 'Combo-Bonus Skalierung', comboLevelExponent: 'Combo-Level Exponent', comboMinimumCount: 'Combo ab Anzahl',
      baseMultiplierBonus: 'Global-Bonus je Prestige', overflowStep: 'Overflow-Schritt', overflowBonus: 'Overflow-Bonus', overflowMaxBonus: 'Overflow-Bonus max.', costGrowth: 'Kosten-Wachstum',
      frameMs: 'Frame ms', maxSimulationDelta: 'Max. Simulations-Delta', maxCatchUpMs: 'Max. Catch-up ms', maxDevicePixelRatio: 'Max. Pixel Ratio',
      floatMergeDistance: 'Popup-Merge Distanz', floatMergeWindowMs: 'Popup-Merge Fenster', graphLength: 'Graph-Länge', dashboardSampleMs: 'Dashboard Sample ms', autosaveMs: 'Autosave ms', saveDebounceMs: 'Save Debounce ms', floatLifetimeMs: 'Popup-Lebensdauer ms', comboPillLifetimeMs: 'Combo-Anzeige ms',
      moneyGrant: 'Geld geben'
    };

    function setParameterValue(path, value){
      const keys = path.split('.');
      const lastKey = keys.pop();
      const parent = keys.reduce((target, key) => target[key], parameters);
      parent[lastKey] = value;
    }

    function renderAdminParameters(){
      const list = document.getElementById('admin-parameters-list');

      if(!list){
        return;
      }

      list.innerHTML = Object.entries(parameters).map(([groupKey, group]) => `
        <div class="admin-parameter-group">
          <div class="admin-parameter-title">${PARAMETER_GROUP_LABELS[groupKey] || groupKey}</div>
          ${Object.entries(group).map(([key, value]) => {
            if(value && typeof value === 'object'){
              return Object.entries(value).map(([nestedKey, nestedValue]) => `
                <label class="admin-parameter-row">
                  <span>${key}.${PARAMETER_LABELS[nestedKey] || nestedKey}</span>
                  <input class="admin-input admin-parameter-input" type="number" step="any" value="${nestedValue}" data-parameter-path="${groupKey}.${key}.${nestedKey}">
                </label>
              `).join('');
            }

            return `
              <label class="admin-parameter-row">
                <span>${PARAMETER_LABELS[key] || key}</span>
                <input class="admin-input admin-parameter-input" type="number" step="any" value="${value}" data-parameter-path="${groupKey}.${key}">
              </label>
            `;
          }).join('')}
        </div>
      `).join('');
    }

    function resetGame(){
      storage.clear();
      achievementService.reset();
      state.coins = 0;
      state.colPerSec = 0;
      state.moneyPerSec = 0;
      state.colCount = 0;
      state.moneyCount = 0;
      state.prestige = 0;
      state.prestigeBonus = 0;
      state.comboCount = 0;
      state.lastComboT = 0;

      for(const key of Object.keys(upgrades)){
        upgrades[key] = 0;
      }

      mergeParameters(parameters, DEFAULT_GAME_PARAMETERS);

      preferences.theme = 'dark';
      preferences.colorMode = 'color';
      preferences.graphVisible = true;
      preferences.ballTrailsVisible = true;
      preferences.moneyPopupsVisible = true;
      objects = [];
      replacementBalls = [];
      ballsPanelDirty = true;
      objectIndex = 0;
      hueIdx = 0;
      collisionMax = 0;
      collisionSum = 0;
      collisionSamples = 0;
      collisionHistory.fill(0);
      moneyMax = 0;
      moneySum = 0;
      moneySamples = 0;
      moneyHistory.fill(0);

      applyPreferences();
      updateUI();
      updateHintMsg();
      saveGame();
    }

    function mkBall(x, y, vx = 0, vy = 0, template = null){
      const r = template ? template.r : getBaseR() * getRandomRadiusMultiplier();
      const col = template ? template.col : COLORS[hueIdx % COLORS.length];

      if(!template){
        hueIdx++;
      }

      const maxSpeed = template && Number.isFinite(template.maxSpeed)
        ? template.maxSpeed
        : Math.sqrt(vx * vx + vy * vy);
      const speed = Math.sqrt(vx * vx + vy * vy);

      if(maxSpeed > 0 && speed > maxSpeed){
        vx = vx / speed * maxSpeed;
        vy = vy / speed * maxSpeed;
      }

      const mass = template && Number.isFinite(template.m) ? template.m : r * r * parameters.balls.massFactor;

      return {
        id: template && Number.isFinite(template.id) ? template.id : objectIndex++,
        x,
        y,
        vx,
        vy,
        r,
        m: mass,
        col,
        active: true,
        maxSpeed,
        collisions: template && Number.isFinite(template.collisions) ? template.collisions : 0,
        imageSrc: template && typeof template.imageSrc === 'string' ? template.imageSrc : '',
        image: null,
        trail: []
      };
    }

    /* Diagramme */

    const collisionHistory = new Array(parameters.ui.graphLength).fill(0);
    const moneyHistory = new Array(parameters.ui.graphLength).fill(0);

    let collisionMax = 0;
    let collisionSum = 0;
    let collisionSamples = 0;
    let moneyMax = 0;
    let moneySum = 0;
    let moneySamples = 0;

    const collisionGraphCanvas = getElementById<HTMLCanvasElement>('collision-graph');
    const collisionGraphCtx = collisionGraphCanvas.getContext('2d');
    const moneyGraphCanvas = getElementById<HTMLCanvasElement>('money-graph');
    const moneyGraphCtx = moneyGraphCanvas.getContext('2d');

    loadGame();

    function drawGraph(canvasContext, canvasElement, history, color){
      const GW = canvasElement.width;
      const GH = canvasElement.height;

      canvasContext.clearRect(0, 0, GW, GH);
      canvasContext.fillStyle = cssVar('--graph-bg');
      canvasContext.fillRect(0, 0, GW, GH);
      canvasContext.strokeStyle = 'rgba(255,255,255,0.05)';
      canvasContext.lineWidth = 0.5;

      for(let i = 1; i < 4; i++){
        const y = GH * i / 4;
        canvasContext.beginPath();
        canvasContext.moveTo(0, y);
        canvasContext.lineTo(GW, y);
        canvasContext.stroke();
      }

      const peak = Math.max(...history, 1);

      canvasContext.beginPath();
      history.forEach((value, index) => {
        const x = index / (parameters.ui.graphLength - 1) * GW;
        const y = GH - value / peak * (GH - 2) - 1;

        if(index === 0){
          canvasContext.moveTo(x, y);
        } else {
          canvasContext.lineTo(x, y);
        }
      });

      canvasContext.lineTo(GW, GH);
      canvasContext.lineTo(0, GH);
      canvasContext.closePath();

      const gradient = canvasContext.createLinearGradient(0, 0, 0, GH);
      gradient.addColorStop(0, preferences.colorMode === 'mono' ? getMonoSoftColor(0.28) : color.fill);
      gradient.addColorStop(1, preferences.colorMode === 'mono' ? getMonoSoftColor(0.02) : color.fade);
      canvasContext.fillStyle = gradient;
      canvasContext.fill();

      canvasContext.beginPath();
      history.forEach((value, index) => {
        const x = index / (parameters.ui.graphLength - 1) * GW;
        const y = GH - value / peak * (GH - 2) - 1;

        if(index === 0){
          canvasContext.moveTo(x, y);
        } else {
          canvasContext.lineTo(x, y);
        }
      });

      canvasContext.strokeStyle = preferences.colorMode === 'mono' ? getMonoInkColor() : color.line;
      canvasContext.lineWidth = 1.5;
      canvasContext.stroke();
    }

    function pushGraphSample(history, value){
      history.push(value);

      if(history.length > parameters.ui.graphLength){
        history.shift();
      }
    }

    function drawDashboard(){
      pushGraphSample(collisionHistory, state.colPerSec);
      pushGraphSample(moneyHistory, state.moneyPerSec);

      collisionMax = Math.max(collisionMax, state.colPerSec);
      collisionSum += state.colPerSec;
      collisionSamples++;

      moneyMax = Math.max(moneyMax, state.moneyPerSec);
      moneySum += state.moneyPerSec;
      moneySamples++;

      const collisionAverage = collisionSamples > 0 ? collisionSum / collisionSamples : 0;
      const moneyAverage = moneySamples > 0 ? moneySum / moneySamples : 0;

      drawGraph(collisionGraphCtx, collisionGraphCanvas, collisionHistory, {
        line: '#9FE1CB',
        fill: 'rgba(159,225,203,0.35)',
        fade: 'rgba(159,225,203,0.02)'
      });

      drawGraph(moneyGraphCtx, moneyGraphCanvas, moneyHistory, {
        line: '#FAC775',
        fill: 'rgba(250,199,117,0.35)',
        fade: 'rgba(250,199,117,0.02)'
      });

      document.getElementById('dash-collisions').textContent =
        formatCompactNumber(state.colPerSec);
      document.getElementById('dash-collisions-max').textContent =
        formatCompactNumber(collisionMax);
      document.getElementById('dash-collisions-avg').textContent =
        formatCompactNumber(collisionAverage);
      document.getElementById('dash-n').textContent = formatCompactNumber(objects.length);

      document.getElementById('dash-money').textContent =
        formatCompactNumber(state.moneyPerSec);
      document.getElementById('dash-money-max').textContent =
        formatCompactNumber(moneyMax);
      document.getElementById('dash-money-avg').textContent =
        formatCompactNumber(moneyAverage);
      document.getElementById('dash-global-mult').textContent =
        getGlobalMoneyMult().toLocaleString('de-DE', { maximumFractionDigits: 2 });
    }

    /* Kugel abschießen */

    const drag = {
      active: false,
      x: 0,
      y: 0,
      startX: 0,
      startY: 0
    };


    function beginShot(event){
      if(objects.length >= getMaxBalls()){
        return;
      }

      event.preventDefault();

      const point = getCanvasPoint(event);

      drag.startX = point.x;
      drag.startY = point.y;
      drag.x = drag.startX;
      drag.y = drag.startY;
      drag.active = true;

      if(canvas.setPointerCapture){
        canvas.setPointerCapture(event.pointerId);
      }
    }

    function moveShot(event){
      if(!drag.active){
        return;
      }

      event.preventDefault();

      const point = getCanvasPoint(event);

      drag.x = point.x;
      drag.y = point.y;
    }

    function finishShot(event){
      if(!drag.active){
        return;
      }

      event.preventDefault();
      drag.active = false;

      if(canvas.releasePointerCapture && canvas.hasPointerCapture(event.pointerId)){
        canvas.releasePointerCapture(event.pointerId);
      }

      if(objects.length >= getMaxBalls()){
        return;
      }

      const point = getCanvasPoint(event);

      drag.x = point.x;
      drag.y = point.y;

      const dx = drag.startX - drag.x;
      const dy = drag.startY - drag.y;

      const distance = Math.sqrt(dx * dx + dy * dy);
      const previousArenaScale = getArenaScale();

      const replacementTemplate = replacementBalls.shift() || null;

      if(distance < parameters.balls.tapShotThreshold){
        const angle = Math.random() * Math.PI * 2;
        const speed = (parameters.balls.randomShotMinSpeed + Math.random() * parameters.balls.randomShotSpeedRange) * getLaunchPowerMultiplier();

        objects.push(
          mkBall(
            drag.startX,
            drag.startY,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            replacementTemplate
          )
        );
      } else {
        const clamped = Math.min(distance, parameters.balls.maxDrag);
        const speed =
          clamped / parameters.balls.maxDrag *
          parameters.balls.aimedShotMaxSpeed *
          getLaunchPowerMultiplier();

        objects.push(
          mkBall(
            drag.startX,
            drag.startY,
            dx / distance * speed,
            dy / distance * speed,
            replacementTemplate
          )
        );
      }

      if(!replacementTemplate && getArenaScale() !== previousArenaScale){
        resizeBallsToCurrentArena();
      }

      ballsPanelDirty = true;
      updateHintMsg();
      evaluateAchievements();
      queueSave();
    }

    function cancelShot(){
      drag.active = false;
    }

    canvas.addEventListener('pointerdown', beginShot);
    canvas.addEventListener('pointermove', moveShot);
    canvas.addEventListener('pointerup', finishShot);
    canvas.addEventListener('pointercancel', cancelShot);

    /* Physik */

    function wallBounce(ball){
      const borderHits = [];

      if(ball.x - ball.r < 0){
        ball.x = ball.r;
        ball.vx = Math.abs(ball.vx);
        borderHits.push({ side: 'left', x: ball.r, y: ball.y });
      }

      if(ball.x + ball.r > W){
        ball.x = W - ball.r;
        ball.vx = -Math.abs(ball.vx);
        borderHits.push({ side: 'right', x: W - ball.r, y: ball.y });
      }

      if(ball.y - ball.r < 0){
        ball.y = ball.r;
        ball.vy = Math.abs(ball.vy);
        borderHits.push({ side: 'top', x: ball.x, y: ball.r });
      }

      if(ball.y + ball.r > H){
        ball.y = H - ball.r;
        ball.vy = -Math.abs(ball.vy);
        borderHits.push({ side: 'bottom', x: ball.x, y: H - ball.r });
      }

      for(const hit of borderHits){
        if(isBorderSideActive(hit.side)){
          ball.collisions++;
          ballsPanelDirty = true;
          onCollision(hit.x, hit.y, parameters.rewards.borderCollisionValue);
        }
      }
    }

    function collide(){
      for(let i = 0; i < objects.length; i++){
        for(let j = i + 1; j < objects.length; j++){

          const a = objects[i];
          const b = objects[j];

          if(a.active === false || b.active === false){
            continue;
          }

          const dx = b.x - a.x;
          const dy = b.y - a.y;

          const distanceSquared = dx * dx + dy * dy;
          const minimumDistance = a.r + b.r;

          if(
            distanceSquared >= minimumDistance * minimumDistance ||
            distanceSquared < 0.001
          ){
            continue;
          }

          const distance = Math.sqrt(distanceSquared);

          const nx = dx / distance;
          const ny = dy / distance;

          const overlap = (minimumDistance - distance) * 0.5;

          a.x -= nx * overlap;
          a.y -= ny * overlap;

          b.x += nx * overlap;
          b.y += ny * overlap;

          const relativeVX = b.vx - a.vx;
          const relativeVY = b.vy - a.vy;

          const velocityAlongNormal =
            relativeVX * nx +
            relativeVY * ny;

          if(velocityAlongNormal > 0){
            continue;
          }

          const impulse =
            -2 * velocityAlongNormal /
            (1 / a.m + 1 / b.m);

          a.vx -= impulse / a.m * nx;
          a.vy -= impulse / a.m * ny;

          b.vx += impulse / b.m * nx;
          b.vy += impulse / b.m * ny;

          a.collisions++;
          b.collisions++;
          ballsPanelDirty = true;

          onCollision(
            (a.x + b.x) / 2,
            (a.y + b.y) / 2
          );
        }
      }
    }

    /* Belohnungen */

    function onCollision(x, y, rewardScale = 1){
      state.colCount++;

      const now = performance.now();

      let earnedCoins = getCoinMult() * rewardScale;

      if(getComboLevel() > 0){

        if(now - state.lastComboT < parameters.rewards.comboWindowMs){
          state.comboCount = Math.min(
            state.comboCount + 1,
            parameters.rewards.comboBaseMax + getComboLevel()
          );
        } else {
          state.comboCount = 1;
        }

        state.lastComboT = now;

        if(state.comboCount >= parameters.rewards.comboMinimumCount){
          const bonus =
            1 +
            Math.log2(state.comboCount - 1) *
            parameters.rewards.comboBonusScale *
            Math.pow(getComboLevel(), parameters.rewards.comboLevelExponent);

          earnedCoins *= bonus;

          document.getElementById('combo-val').textContent =
            bonus.toFixed(1);

          document.getElementById('combo-pill').style.opacity = '1';

          setTimeout(() => {
            document.getElementById('combo-pill').style.opacity = '0';
          }, parameters.ui.comboPillLifetimeMs);
        }
      }

      earnedCoins = Math.ceil(earnedCoins);

      state.coins += earnedCoins;
      state.moneyCount += earnedCoins;

      if(preferences.moneyPopupsVisible){
        spawnFloat(x, y, earnedCoins);
      }
      updateCoinsUI();
      evaluateAchievements();
    }

    function clearFloatTexts(){
      for(const item of activeFloatTexts){
        item.element.remove();
      }

      activeFloatTexts.length = 0;
    }

    function spawnFloat(x, y, value){
      const rect = canvas.getBoundingClientRect();
      const screenX = x * (rect.width / W);
      const screenY = y * (rect.height / H);
      const now = performance.now();

      const nearbyFloat = activeFloatTexts.find(item => {
        if(now - item.updatedAt > parameters.ui.floatMergeWindowMs){
          return false;
        }

        const dx = item.x - screenX;
        const dy = item.y - screenY;

        return dx * dx + dy * dy <= parameters.ui.floatMergeDistance * parameters.ui.floatMergeDistance;
      });

      if(nearbyFloat){
        nearbyFloat.value += value;
        nearbyFloat.x = (nearbyFloat.x + screenX) / 2;
        nearbyFloat.y = (nearbyFloat.y + screenY) / 2;
        nearbyFloat.updatedAt = now;
        nearbyFloat.element.textContent = '+' + formatCompactNumber(nearbyFloat.value);
        nearbyFloat.element.style.left = nearbyFloat.x + 'px';
        nearbyFloat.element.style.top = nearbyFloat.y + 'px';
        nearbyFloat.element.classList.remove('is-merged');
        void nearbyFloat.element.offsetWidth;
        nearbyFloat.element.classList.add('is-merged');
        return;
      }

      const element = document.createElement('div');
      const floatItem = {
        element,
        value,
        x: screenX,
        y: screenY,
        updatedAt: now
      };

      element.className = 'float-text';
      element.textContent = '+' + formatCompactNumber(value);
      element.style.left = screenX + 'px';
      element.style.top = screenY + 'px';

      activeFloatTexts.push(floatItem);

      document
        .getElementById('float-coins')
        .appendChild(element);

      setTimeout(() => {
        element.remove();
        const index = activeFloatTexts.indexOf(floatItem);

        if(index >= 0){
          activeFloatTexts.splice(index, 1);
        }
      }, parameters.ui.floatLifetimeMs);
    }

    /* Zeichnen */

    function drawGrid(){
      ctx.strokeStyle = cssVar('--grid');
      ctx.lineWidth = 1;

      for(let x = 0; x < W; x += 60){
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }

      for(let y = 0; y < H; y += 60){
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
    }

    function drawBorders(){
      const activeSides = BORDER_SIDES.slice(0, upgrades.border);

      if(activeSides.length === 0){
        return;
      }

      ctx.save();
      ctx.lineWidth = 4;
      ctx.lineCap = 'butt';

      for(const side of activeSides){
        ctx.strokeStyle = preferences.colorMode === 'mono'
          ? getMonoSoftColor(0.48)
          : side.color;
        ctx.beginPath();

        if(side.key === 'top'){
          ctx.moveTo(0, 2);
          ctx.lineTo(W, 2);
        } else if(side.key === 'right'){
          ctx.moveTo(W - 2, 0);
          ctx.lineTo(W - 2, H);
        } else if(side.key === 'bottom'){
          ctx.moveTo(W, H - 2);
          ctx.lineTo(0, H - 2);
        } else {
          ctx.moveTo(2, H);
          ctx.lineTo(2, 0);
        }

        ctx.stroke();
      }

      ctx.restore();
    }

    function drawBall(ball){
      if(preferences.ballTrailsVisible && ball.trail.length > 1){
        ctx.beginPath();
        ctx.moveTo(ball.trail[0].x, ball.trail[0].y);

        for(let i = 1; i < ball.trail.length; i++){
          ctx.lineTo(
            ball.trail[i].x,
            ball.trail[i].y
          );
        }

        const color = displayColor(ball.col);

        ctx.strokeStyle = color + '40';
        ctx.lineWidth = ball.r * 0.6;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.lineCap = 'butt';
      }

      const color = displayColor(ball.col);

      if(preferences.colorMode === 'mono'){
        ctx.save();
        ctx.shadowColor = preferences.theme === 'light'
          ? 'rgba(0,0,0,0.22)'
          : 'rgba(255,255,255,0.18)';
        ctx.shadowBlur = ball.r * 0.7;
        ctx.shadowOffsetX = preferences.theme === 'light' ? 1.5 : 0;
        ctx.shadowOffsetY = preferences.theme === 'light' ? 2 : 0;
      }

      ctx.beginPath();
      ctx.arc(
        ball.x,
        ball.y,
        ball.r,
        0,
        Math.PI * 2
      );

      if(ball.imageSrc){
        ensureBallImageLoaded(ball);
      }

      if(ball.image && ball.image.complete && ball.image.naturalWidth > 0){
        const sourceSize = Math.min(ball.image.naturalWidth, ball.image.naturalHeight);
        const sourceX = (ball.image.naturalWidth - sourceSize) / 2;
        const sourceY = (ball.image.naturalHeight - sourceSize) / 2;

        ctx.save();
        ctx.clip();
        ctx.drawImage(
          ball.image,
          sourceX,
          sourceY,
          sourceSize,
          sourceSize,
          ball.x - ball.r,
          ball.y - ball.r,
          ball.r * 2,
          ball.r * 2
        );
        ctx.restore();
      } else {
        ctx.fillStyle = color + 'dd';
        ctx.fill();
      }

      if(preferences.colorMode === 'mono'){
        ctx.restore();
      }

      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(
        ball.x - ball.r * 0.28,
        ball.y - ball.r * 0.28,
        ball.r * 0.2,
        0,
        Math.PI * 2
      );

      ctx.fillStyle = preferences.colorMode === 'mono'
        ? getMonoSoftColor(preferences.theme === 'light' ? 0.12 : 0.32)
        : 'rgba(255,255,255,0.22)';
      ctx.fill();
    }

    /* Hauptschleife */


    let lastTime = performance.now();
    let lastBackgroundTime = lastTime;
    let fpsFrameCount = 0;
    let fpsLastUpdate = lastTime;

    function getTotalKineticEnergy(){
      return objects.reduce((total, ball) => {
        if(ball.active === false){
          return total;
        }

        return total + 0.5 * ball.m * (ball.vx * ball.vx + ball.vy * ball.vy);
      }, 0);
    }

    function updateSystemMeters(now){
      fpsFrameCount++;

      if(now - fpsLastUpdate >= 500){
        const fps = fpsFrameCount * 1000 / (now - fpsLastUpdate);
        document.getElementById('fps-val').textContent = Math.round(fps).toString();
        fpsFrameCount = 0;
        fpsLastUpdate = now;
      }

      document.getElementById('energy-val').textContent =
        formatCompactNumber(getTotalKineticEnergy(), 2);
    }
    function simulateStep(delta, shouldDraw){
      for(const ball of objects){
        if(ball.active === false){
          continue;
        }

        ball.x += ball.vx * delta;
        ball.y += ball.vy * delta;

        wallBounce(ball);

        if(shouldDraw && preferences.ballTrailsVisible){
          ball.trail.push({
            x: ball.x,
            y: ball.y
          });

          if(ball.trail.length > parameters.balls.trailLength){
            ball.trail.shift();
          }
        }
      }

      collide();
    }

    function simulateElapsed(elapsedMs, shouldDraw){
      const cappedElapsedMs = Math.min(
        Math.max(elapsedMs, 0),
        parameters.physics.maxCatchUpMs
      );

      let remainingDelta = cappedElapsedMs / parameters.physics.frameMs;

      while(remainingDelta > 0){
        const delta = Math.min(
          remainingDelta,
          parameters.physics.maxSimulationDelta
        );

        simulateStep(delta, shouldDraw && remainingDelta <= parameters.physics.maxSimulationDelta);
        remainingDelta -= delta;
      }
    }

    function drawFrame(){
      ctx.fillStyle = cssVar('--bg');
      ctx.fillRect(0, 0, W, H);

      drawGrid();
      drawBorders();

      for(const ball of objects){
        if(ball.active !== false){
          drawBall(ball);
        }
      }

      drawDashboard();
    }

    function updateCollisionRate(now){
      if(now - state.lastColT <= parameters.ui.dashboardSampleMs){
        return;
      }

      const elapsed =
        (now - state.lastColT) / 1000;

      state.colPerSec =
        Math.round(
          state.colCount /
          elapsed *
          10
        ) / 10;

      state.moneyPerSec =
        Math.round(
          state.moneyCount /
          elapsed
        );

      state.colCount = 0;
      state.moneyCount = 0;
      state.lastColT = now;

      document.getElementById('col-val').textContent =
        formatCompactNumber(state.colPerSec);
    }

    function loop(now){
      requestAnimationFrame(loop);

      if(document.hidden){
        lastTime = now;
        return;
      }

      simulateElapsed(now - lastTime, true);
      lastTime = now;
      lastBackgroundTime = now;

      updateCollisionRate(now);
      updateSystemMeters(now);
      drawFrame();

      if(ballsPanelDirty && now - lastBallsPanelRender > 500){
        renderBallsPanel();
      }

      if(drag.active){
        const dx = drag.startX - drag.x;
        const dy = drag.startY - drag.y;

        const distance = Math.sqrt(
          dx * dx +
          dy * dy
        );

        if(distance > parameters.balls.tapShotThreshold){
          const clamped = Math.min(distance, parameters.balls.maxDrag);
          const power = clamped / parameters.balls.maxDrag;
          const radius = getBaseR();

          ctx.beginPath();
          ctx.arc(
            drag.startX,
            drag.startY,
            radius,
            0,
            Math.PI * 2
          );

          ctx.strokeStyle =
            preferences.colorMode === 'mono'
              ? getMonoSoftColor(0.15 + power * 0.3)
              : `rgba(255,255,255,${0.15 + power * 0.3})`;

          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 3]);
          ctx.stroke();
          ctx.setLineDash([]);

          const nx = dx / distance;
          const ny = dy / distance;

          const lineLength = clamped * 0.7;

          const endX =
            drag.startX +
            nx * lineLength;

          const endY =
            drag.startY +
            ny * lineLength;

          ctx.beginPath();
          ctx.moveTo(
            drag.startX,
            drag.startY
          );

          ctx.lineTo(
            endX,
            endY
          );

          const color = preferences.colorMode === 'mono'
            ? getMonoSoftColor(0.5 + power * 0.4)
            : `rgba(` +
            `${Math.round(100 + 155 * power)},` +
            `${Math.round(200 - 100 * power)},` +
            `255,` +
            `${0.5 + power * 0.4}` +
            `)`;

          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.stroke();

          const angle = Math.atan2(ny, nx);

          ctx.beginPath();
          ctx.moveTo(endX, endY);

          ctx.lineTo(
            endX - 12 * Math.cos(angle - 0.4),
            endY - 12 * Math.sin(angle - 0.4)
          );

          ctx.lineTo(
            endX - 12 * Math.cos(angle + 0.4),
            endY - 12 * Math.sin(angle + 0.4)
          );

          ctx.closePath();
          ctx.fillStyle = color;
          ctx.fill();

          ctx.fillStyle = preferences.colorMode === 'mono'
            ? getMonoSoftColor(0.55)
            : 'rgba(255,255,255,0.55)';
          ctx.font = '10px ui-monospace,monospace';

          ctx.fillText(
            Math.round(power * 100) + '%',
            drag.startX + 8,
            drag.startY - radius - 6
          );
        }
      }

    }

    requestAnimationFrame(loop);

    setInterval(() => {
      if(!document.hidden){
        return;
      }

      const now = performance.now();

      simulateElapsed(now - lastBackgroundTime, false);
      updateCollisionRate(now);
      document.getElementById('energy-val').textContent =
        formatCompactNumber(getTotalKineticEnergy(), 2);
      lastBackgroundTime = now;
      lastTime = now;
      drawDashboard();
    }, 1000);

    document.addEventListener('visibilitychange', () => {
      const now = performance.now();

      if(document.hidden){
        drag.active = false;
        lastBackgroundTime = now;
      } else {
        simulateElapsed(now - lastBackgroundTime, false);
        updateCollisionRate(now);
        lastTime = now;
        lastBackgroundTime = now;
        updateUI();
      }
    });

    /* UI */

    function formatCompactNumber(value, maximumFractionDigits = 1){
      const sign = value < 0 ? '-' : '';
      const absoluteValue = Math.abs(value);

      if(absoluteValue < 1000){
        return sign + Math.floor(absoluteValue).toString();
      }

      const suffixes = [
        { value: 1000000000000, suffix: 'T' },
        { value: 1000000000, suffix: 'B' },
        { value: 1000000, suffix: 'M' },
        { value: 1000, suffix: 'k' }
      ];

      const unit = suffixes.find(item => absoluteValue >= item.value);
      const scaled = absoluteValue / unit.value;
      const factor = Math.pow(10, maximumFractionDigits);
      const rounded = Math.round(scaled * factor) / factor;
      const formatted = rounded
        .toFixed(maximumFractionDigits)
        .replace(/\.0+$/, '')
        .replace(/(\.\d*?)0+$/, '$1');

      return sign + formatted + unit.suffix;
    }

    function formatBallSize(ball){
      return formatCompactNumber(ball.r * 2);
    }

    function renderBallsPanel(force = false){
      if(!force && !ballsPanelDirty){
        return;
      }

      lastBallsPanelRender = performance.now();

      const list = document.getElementById('balls-list');
      const summary = document.getElementById('balls-summary');
      const toggleValue = document.getElementById('balls-toggle-value');
      const bulkToggle = getElementById<HTMLButtonElement>('btn-balls-bulk-toggle');
      const bulkToggleValue = document.getElementById('balls-bulk-toggle-value');
      const pendingReplacementCount = replacementBalls.length;

      toggleValue.textContent =
        pendingReplacementCount > 0
          ? `${formatCompactNumber(pendingReplacementCount)} zum Neuschießen`
          : `${formatCompactNumber(objects.length)} Kugeln`;

      if(objects.length === 0){
        summary.textContent = pendingReplacementCount > 0
          ? `${formatCompactNumber(pendingReplacementCount)} ersetzte Kugeln warten in Reihenfolge aufs Neuschießen.`
          : 'Keine Kugeln vorhanden.';
        list.innerHTML = '';
        bulkToggle.disabled = true;
        bulkToggle.textContent = 'Alle Kugeln ersetzen';
        bulkToggle.appendChild(bulkToggleValue);
        bulkToggleValue.textContent = pendingReplacementCount > 0
          ? 'Alle warten'
          : 'Keine Kugeln';
        ballsPanelDirty = false;
        return;
      }

      summary.textContent =
        `${formatCompactNumber(objects.length)} Kugeln im Feld · ${formatCompactNumber(pendingReplacementCount)} zum Neuschießen`;

      bulkToggle.disabled = false;
      bulkToggle.textContent = 'Alle Kugeln ersetzen';
      bulkToggle.appendChild(bulkToggleValue);
      bulkToggleValue.textContent = `${formatCompactNumber(objects.length)} im Feld`;

      list.innerHTML = objects
        .map((ball, index) => {
          const ballNumber = index + 1;
          const statusLabel = 'Ersetzen';
          const statusClass = 'is-active';

          return `
            <div class="ball-row ${statusClass}" role="listitem">
              <button class="ball-color" type="button" style="background:${ball.col}" data-ball-id="${ball.id}" aria-label="Farbe von Ball Nr. ${ballNumber} ändern"></button>
              <input class="ball-color-input" type="color" value="${ball.col}" data-ball-id="${ball.id}" aria-label="Farbe von Ball Nr. ${ballNumber}">
              <div class="ball-info">
                <div class="ball-title">Ball Nr. ${ballNumber}</div>
                <div class="ball-meta">Größe ${formatBallSize(ball)} · Kollisionen ${formatCompactNumber(ball.collisions || 0)}${ball.imageSrc ? ' · Bild aktiv' : ''}</div>
              </div>
              <div class="ball-actions">
                <label class="ball-image">
                  Bild
                  <input class="ball-image-input" type="file" accept="image/*" data-ball-id="${ball.id}" aria-label="Bild für Ball Nr. ${ballNumber} laden">
                </label>
                <button class="ball-toggle" type="button" data-ball-id="${ball.id}">${statusLabel}</button>
              </div>
            </div>
          `;
        })
        .join('');

      ballsPanelDirty = false;
    }

    function createReplacementBall(ball){
      return {
        id: ball.id,
        r: ball.r,
        m: ball.m,
        col: ball.col,
        maxSpeed: Number.isFinite(ball.maxSpeed)
          ? ball.maxSpeed
          : Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy),
        collisions: Number.isFinite(ball.collisions) ? ball.collisions : 0,
        imageSrc: typeof ball.imageSrc === 'string' ? ball.imageSrc : '',
        image: null
      };
    }

    function replaceAllBalls(){
      replacementBalls.push(...objects.map(createReplacementBall));
      objects = [];

      ballsPanelDirty = true;
      updateHintMsg();
      renderBallsPanel(true);
      queueSave();
    }

    function ensureBallImageLoaded(ball){
      if(!ball.imageSrc || (ball.image && ball.image.dataset.src === ball.imageSrc)){
        return;
      }

      const image = new Image();
      image.dataset.src = ball.imageSrc;
      image.addEventListener('error', () => {
        if(ball.image === image){
          ball.image = null;
        }
      });
      image.src = ball.imageSrc;
      ball.image = image;
    }

    function setBallColor(ballId, color){
      const ball = objects.find(item => item.id === ballId);

      if(!ball || !/^#[0-9a-f]{6}$/i.test(color)){
        return;
      }

      ball.col = color;
      ballsPanelDirty = true;
      renderBallsPanel(true);
      queueSave();
    }

    function setBallImage(ballId, imageSrc){
      const ball = objects.find(item => item.id === ballId);

      if(!ball){
        return;
      }

      ball.imageSrc = imageSrc;
      ball.image = null;
      ballsPanelDirty = true;
      renderBallsPanel(true);
      queueSave();
    }

    function replaceBall(ballId){
      const ballIndex = objects.findIndex(item => item.id === ballId);

      if(ballIndex < 0){
        return;
      }

      const [ball] = objects.splice(ballIndex, 1);
      replacementBalls.push(createReplacementBall(ball));
      ballsPanelDirty = true;
      updateHintMsg();
      renderBallsPanel(true);
      queueSave();
    }


    const LEADERBOARD_PLAYER_KEY = 'ballsAndMoneyLeaderboardPlayer';
    const LEADERBOARD_API_BASE = 'https://ballsandmoney.onrender.com';
    const LEADERBOARD_LIMIT = 25;
    let leaderboardPlayer = loadLeaderboardPlayer();
    let leaderboardBusy = false;

    function getLeaderboardUrl(path){
      return `${LEADERBOARD_API_BASE}/api/leaderboard${path}`;
    }

    function loadLeaderboardPlayer(){
      try{
        const raw = localStorage.getItem(LEADERBOARD_PLAYER_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch(error){
        localStorage.removeItem(LEADERBOARD_PLAYER_KEY);
        return null;
      }
    }

    function saveLeaderboardPlayer(player){
      leaderboardPlayer = player;

      if(player){
        localStorage.setItem(LEADERBOARD_PLAYER_KEY, JSON.stringify(player));
      } else {
        localStorage.removeItem(LEADERBOARD_PLAYER_KEY);
      }

      updateLeaderboardAuthUI();
    }

    function getLeaderboardPayload(){
      return {
        prestige: Math.max(0, Math.floor(state.prestige || 0)),
        money: Math.max(0, Math.floor(state.coins || 0)),
        balls: Math.max(0, objects.length + replacementBalls.length)
      };
    }

    function setLeaderboardMessage(message, isError = false){
      const messageElement = document.getElementById('leaderboard-message');
      messageElement.textContent = message;
      messageElement.classList.toggle('is-error', isError);
    }

    function updateLeaderboardAuthUI(){
      const isLoggedIn = Boolean(leaderboardPlayer?.id && leaderboardPlayer?.token);
      const loginBox = getElementById<HTMLElement>('leaderboard-login');
      const profileBox = getElementById<HTMLElement>('leaderboard-profile');
      const playerName = document.getElementById('leaderboard-player-name');
      const submitButton = getElementById<HTMLButtonElement>('btn-leaderboard-submit');
      const status = document.getElementById('leaderboard-status');

      loginBox.hidden = isLoggedIn;
      profileBox.hidden = !isLoggedIn;
      submitButton.disabled = !isLoggedIn || leaderboardBusy;
      status.textContent = isLoggedIn ? `Angemeldet: ${leaderboardPlayer.name}` : 'Nicht angemeldet';
      playerName.textContent = isLoggedIn ? leaderboardPlayer.name : '-';
    }

    function updateLeaderboardScoreUI(){
      const score = getLeaderboardPayload();
      document.getElementById('leaderboard-current-score').textContent =
        `Prestige ${formatCompactNumber(score.prestige)} · ${formatCompactNumber(score.money)} 🪙 · ${formatCompactNumber(score.balls)} Kugeln`;
      updateLeaderboardAuthUI();
    }

    function renderLeaderboard(entries){
      const list = document.getElementById('leaderboard-list');

      if(!Array.isArray(entries) || entries.length === 0){
        list.innerHTML = '<div class="leaderboard-empty">Noch keine Scores vorhanden.</div>';
        return;
      }

      list.innerHTML = entries.map(entry => `
        <div class="leaderboard-row${leaderboardPlayer?.id === entry.playerId ? ' is-current' : ''}">
          <div class="leaderboard-rank">#${entry.rank}</div>
          <div class="leaderboard-entry-main">
            <div class="leaderboard-entry-name"></div>
            <div class="leaderboard-entry-meta">Prestige ${formatCompactNumber(entry.prestige)} · ${formatCompactNumber(entry.money)} 🪙 · ${formatCompactNumber(entry.balls)} Kugeln</div>
          </div>
        </div>
      `).join('');

      Array.from(list.querySelectorAll('.leaderboard-entry-name')).forEach((node, index) => {
        node.textContent = entries[index].name;
      });
    }

    async function refreshLeaderboard(){
      try{
        setLeaderboardMessage('Leaderboard wird geladen ...');
        const response = await fetch(getLeaderboardUrl(`?limit=${LEADERBOARD_LIMIT}`));
        const data = await response.json();

        if(!response.ok){
          throw new Error(data.error || 'Leaderboard konnte nicht geladen werden.');
        }

        renderLeaderboard(data.entries || []);
        setLeaderboardMessage('Leaderboard aktualisiert.');
      } catch(error){
        setLeaderboardMessage(error instanceof Error ? error.message : 'Leaderboard konnte nicht geladen werden.', true);
      }
    }

    async function openLeaderboard(){
      updateLeaderboardScoreUI();

      if(leaderboardBusy){
        return;
      }

      if(leaderboardPlayer?.id && leaderboardPlayer?.token){
        await submitLeaderboardScore();
        return;
      }

      await refreshLeaderboard();
    }

    async function loginLeaderboard(){
      const input = getElementById<HTMLInputElement>('leaderboard-name-input');
      const name = input.value.trim();

      if(name.length < 2){
        setLeaderboardMessage('Bitte gib mindestens 2 Zeichen ein.', true);
        return;
      }

      try{
        leaderboardBusy = true;
        updateLeaderboardAuthUI();
        setLeaderboardMessage('Anmeldung läuft ...');
        const response = await fetch(getLeaderboardUrl('/login'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });
        const data = await response.json();

        if(!response.ok){
          throw new Error(data.error || 'Anmeldung fehlgeschlagen.');
        }

        saveLeaderboardPlayer(data.player);
        input.value = '';
        setLeaderboardMessage('Angemeldet. Du kannst deinen Score senden.');
        await submitLeaderboardScore();
      } catch(error){
        setLeaderboardMessage(error instanceof Error ? error.message : 'Anmeldung fehlgeschlagen.', true);
      } finally {
        leaderboardBusy = false;
        updateLeaderboardAuthUI();
      }
    }

    async function submitLeaderboardScore(){
      if(!leaderboardPlayer?.id || !leaderboardPlayer?.token){
        setLeaderboardMessage('Bitte zuerst anmelden.', true);
        return;
      }

      try{
        leaderboardBusy = true;
        updateLeaderboardAuthUI();
        setLeaderboardMessage('Score wird gesendet ...');
        const response = await fetch(getLeaderboardUrl('/score'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: leaderboardPlayer.id,
            token: leaderboardPlayer.token,
            ...getLeaderboardPayload()
          })
        });
        const data = await response.json();

        if(!response.ok){
          throw new Error(data.error || 'Score konnte nicht gespeichert werden.');
        }

        renderLeaderboard(data.entries || []);
        setLeaderboardMessage('Score gespeichert.');
      } catch(error){
        setLeaderboardMessage(error instanceof Error ? error.message : 'Score konnte nicht gespeichert werden.', true);
      } finally {
        leaderboardBusy = false;
        updateLeaderboardAuthUI();
      }
    }

    function updateCoinsUI(){
      document.getElementById('coins-val').textContent =
        formatCompactNumber(state.coins);

      updateButtons();
    }

    function updateUI(){
      updateCoinsUI();
      renderBallsPanel();
      updateLeaderboardScoreUI();
      evaluateAchievements();
      queueSave();
    }

    function evaluateAchievements(){
      achievementService.evaluate({
        coins: state.coins,
        balls: objects.length,
        collisions: objects.reduce((sum, ball) => sum + (ball.collisions || 0), 0),
        upgradeLevels: Object.values(upgrades).reduce((sum, level) => sum + level, 0),
        prestige: state.prestige || 0
      });
    }

    function updateButtons(){
      const coins = state.coins;

      function updateUpgradeButton(key, buttonId, costId){
        const level = upgrades[key];
        const cost = getCost(key, level);

        const button =
          getElementById<HTMLButtonElement>(buttonId);

        const costElement =
          document.getElementById(costId);

        const maxed = cost === Infinity;

        button.disabled = maxed || (!adminFreeUpgrades && coins < cost);

        button.className =
          'upgrade-btn' +
          (
            !maxed &&
            (adminFreeUpgrades || coins >= cost)
              ? ' can-afford'
              : ''
          );

        if(maxed){
          costElement.textContent = 'MAX ✓';
          costElement.className = 'btn-cost maxed';
        } else {
          costElement.textContent = adminFreeUpgrades ? 'KOSTENLOS · ' + formatCompactNumber(cost) + ' 🪙' : formatCompactNumber(cost) + ' 🪙';
          costElement.className = 'btn-cost';
        }
      }

      updateUpgradeButton(
        'size',
        'btn-size',
        'cost-size'
      );

      updateUpgradeButton(
        'mult',
        'btn-mult',
        'cost-mult'
      );

      updateUpgradeButton(
        'cap',
        'btn-cap',
        'cost-cap'
      );

      updateUpgradeButton(
        'combo',
        'btn-combo',
        'cost-combo'
      );

      updateUpgradeButton(
        'launch',
        'btn-launch',
        'cost-launch'
      );

      updateUpgradeButton(
        'border',
        'btn-border',
        'cost-border'
      );

      const prestigeButton = getElementById<HTMLButtonElement>('btn-prestige');
      const prestigeCostElement = document.getElementById('cost-prestige');
      const prestigeCost = getPrestigeCost();

      prestigeButton.disabled = false;
      prestigeButton.className =
        'upgrade-btn' + (coins >= prestigeCost ? ' can-afford' : '');
      const prestigeCostText =
        formatCompactNumber(prestigeCost) +
        ` 🪙 → Global x${getNextGlobalMoneyMult().toLocaleString('de-DE', { maximumFractionDigits: 2 })}`;

      prestigeCostElement.textContent = prestigeCostText;
      document.getElementById('prestige-current-mult').textContent =
        `Global x${getGlobalMoneyMult().toLocaleString('de-DE', { maximumFractionDigits: 2 })}`;
      document.getElementById('prestige-next-mult').textContent =
        `Global x${getNextGlobalMoneyMult().toLocaleString('de-DE', { maximumFractionDigits: 2 })}`;
      document.getElementById('prestige-panel-cost').textContent =
        formatCompactNumber(prestigeCost) + ' 🪙';
      const prestigeConfirmButton = getElementById<HTMLButtonElement>('btn-prestige-confirm');
      prestigeConfirmButton.disabled = false;
      prestigeConfirmButton.className =
        'upgrade-btn danger' + (coins >= prestigeCost ? ' can-afford' : '');
    }

    function getPrestigeCost(){
      return Math.round(parameters.prestige.baseCost * Math.pow(parameters.prestige.costGrowth, state.prestige || 0));
    }

    function getNextGlobalMoneyMult(){
      return getGlobalMoneyMult() + parameters.prestige.baseMultiplierBonus + getPrestigeOverflowBonus();
    }

    function performPrestige(){
      const prestigeCost = getPrestigeCost();

      if(state.coins < prestigeCost){
        alert(
          'Prestige benötigt ' +
          formatCompactNumber(prestigeCost) +
          ' 🪙. Dir fehlen noch ' +
          formatCompactNumber(Math.ceil(prestigeCost - state.coins)) +
          ' 🪙.'
        );
        return false;
      }

      state.prestigeBonus = (state.prestigeBonus || 0) + getPrestigeOverflowBonus();
      state.prestige = (state.prestige || 0) + 1;
      state.coins = 0;
      state.colPerSec = 0;
      state.moneyPerSec = 0;
      state.colCount = 0;
      state.moneyCount = 0;
      state.comboCount = 0;
      state.lastComboT = 0;

      for(const key of Object.keys(upgrades)){
        upgrades[key] = 0;
      }

      objects = [];
      replacementBalls = [];
      ballsPanelDirty = true;
      objectIndex = 0;
      hueIdx = 0;
      collisionMax = 0;
      collisionSum = 0;
      collisionSamples = 0;
      collisionHistory.fill(0);
      moneyMax = 0;
      moneySum = 0;
      moneySamples = 0;
      moneyHistory.fill(0);

      updateUI();
      updateHintMsg();
      saveGame();

      return true;
    }

    function grantAdminMoney(){
      state.coins += parameters.admin.moneyGrant;
      state.moneyCount += parameters.admin.moneyGrant;
      updateUI();
      saveGame();
    }

    function buy(cost, action){
      if(
        !Number.isFinite(cost) ||
        (!adminFreeUpgrades && state.coins < cost)
      ){
        return;
      }

      if(!adminFreeUpgrades){
        state.coins -= cost;
      }

      action();
      updateUI();
    }

    /* Shop-Buttons */

    document
      .getElementById('btn-size')
      .addEventListener('click', () => {
        const level = upgrades.size;
        const cost = getCost('size', level);

        buy(cost, () => {
          upgrades.size++;
        });
      });

    document
      .getElementById('btn-mult')
      .addEventListener('click', () => {
        const level = upgrades.mult;
        const cost = getCost('mult', level);

        buy(cost, () => {
          upgrades.mult++;
        });
      });

    document
      .getElementById('btn-cap')
      .addEventListener('click', () => {
        const level = upgrades.cap;
        const cost = getCost('cap', level);

        buy(cost, () => {
          upgrades.cap++;
          updateHintMsg();
        });
      });

    document
      .getElementById('btn-combo')
      .addEventListener('click', () => {
        const level = upgrades.combo;
        const cost = getCost('combo', level);

        buy(cost, () => {
          upgrades.combo++;
        });
      });

    document
      .getElementById('btn-launch')
      .addEventListener('click', () => {
        const level = upgrades.launch;
        const cost = getCost('launch', level);

        buy(cost, () => {
          upgrades.launch++;
        });
      });

    document
      .getElementById('btn-border')
      .addEventListener('click', () => {
        const level = upgrades.border;
        const cost = getCost('border', level);

        buy(cost, () => {
          upgrades.border++;
        });
      });

    function bindSlidePanel(toggleId, panelId, closeId, onOpen = null){
      const toggle = getElementById<HTMLButtonElement>(toggleId);
      const panel = getElementById<HTMLElement>(panelId);
      const close = getElementById<HTMLButtonElement>(closeId);

      if(panel.parentElement !== document.body){
        document.body.appendChild(panel);
      }

      function setOpen(isOpen){
        panel.classList.toggle('is-open', isOpen);
        panel.setAttribute('aria-hidden', String(!isOpen));
        toggle.setAttribute('aria-expanded', String(isOpen));
      }

      toggle.addEventListener('click', () => {
        setOpen(true);

        if(typeof onOpen === 'function'){
          onOpen();
        }
      });
      close.addEventListener('click', () => setOpen(false));
      panel.addEventListener('click', event => {
        if(event.target === panel){
          setOpen(false);
        }
      });

      const card = panel.querySelector('.slide-panel-card') as HTMLElement;
      let swipeStartY = 0;
      let swipeStartX = 0;
      let swipeTracking = false;

      card.addEventListener('pointerdown', event => {
        if(event.pointerType === 'mouse'){
          return;
        }

        swipeStartY = event.clientY;
        swipeStartX = event.clientX;
        swipeTracking = card.scrollTop <= 0;
      }, { passive: true });

      card.addEventListener('pointerup', event => {
        if(!swipeTracking){
          return;
        }

        const deltaY = event.clientY - swipeStartY;
        const deltaX = Math.abs(event.clientX - swipeStartX);
        swipeTracking = false;

        if(deltaY > 70 && deltaY > deltaX * 1.4){
          setOpen(false);
        }
      }, { passive: true });

      card.addEventListener('pointercancel', () => {
        swipeTracking = false;
      }, { passive: true });

      return () => setOpen(false);
    }

    const closePrestigePanel = bindSlidePanel('btn-prestige', 'prestige-panel', 'btn-prestige-close');
    const closeSettingsPanel = bindSlidePanel('btn-settings-toggle', 'settings-panel', 'btn-settings-close');
    bindSlidePanel('btn-balls-toggle', 'balls-panel', 'btn-balls-close');
    bindSlidePanel('btn-admin-toggle', 'admin-panel', 'btn-admin-close');
    bindSlidePanel('btn-achievements', 'achievement-panel', 'btn-achievements-close');
    bindSlidePanel('btn-leaderboard', 'leaderboard-panel', 'btn-leaderboard-close', openLeaderboard);

    document
      .getElementById('btn-leaderboard-login')
      .addEventListener('click', loginLeaderboard);

    getElementById<HTMLInputElement>('leaderboard-name-input').addEventListener('keydown', event => {
      if(event.key === 'Enter'){
        loginLeaderboard();
      }
    });

    document
      .getElementById('btn-leaderboard-logout')
      .addEventListener('click', () => {
        saveLeaderboardPlayer(null);
        setLeaderboardMessage('Abgemeldet.');
      });

    document
      .getElementById('btn-leaderboard-submit')
      .addEventListener('click', submitLeaderboardScore);

    document
      .getElementById('btn-leaderboard-refresh')
      .addEventListener('click', refreshLeaderboard);

    document
      .getElementById('btn-balls-bulk-toggle')
      .addEventListener('click', () => {
        replaceAllBalls();
      });

    document
      .getElementById('balls-list')
      .addEventListener('click', event => {
        const target = event.target as HTMLElement;

        if(target.matches('.ball-color')){
          const input = target.parentElement.querySelector('.ball-color-input') as HTMLInputElement;
          input.click();
          return;
        }

        if(!target.matches('.ball-toggle')){
          return;
        }

        replaceBall(Number(target.dataset['ballId']));
      });

    document
      .getElementById('balls-list')
      .addEventListener('change', event => {
        const target = event.target as HTMLInputElement;

        if(target.matches('.ball-color-input')){
          setBallColor(Number(target.dataset['ballId']), target.value);
          return;
        }

        if(!target.matches('.ball-image-input') || !target.files || target.files.length === 0){
          return;
        }

        const file = target.files[0];

        if(!file.type.startsWith('image/')){
          target.value = '';
          return;
        }

        const reader = new FileReader();
        reader.addEventListener('load', () => {
          if(typeof reader.result === 'string'){
            setBallImage(Number(target.dataset['ballId']), reader.result);
          }
        });
        reader.readAsDataURL(file);
        target.value = '';
      });

    document
      .getElementById('btn-prestige-confirm')
      .addEventListener('click', () => {
        if(performPrestige()){
          closePrestigePanel();
        }
      });

    const adminCode = '1906';
    const adminCodeInput = getElementById<HTMLInputElement>('admin-code-input');
    const adminCodeMessage = getElementById<HTMLElement>('admin-code-message');
    const adminCodeBox = getElementById<HTMLElement>('admin-code-box');
    const adminActions = getElementById<HTMLElement>('admin-actions');
    let adminUnlocked = false;

    function setAdminUnlocked(isUnlocked){
      adminUnlocked = isUnlocked;
      adminCodeBox.hidden = isUnlocked;
      adminActions.hidden = !isUnlocked;
      adminCodeMessage.textContent = isUnlocked ? 'Admin Panel freigeschaltet.' : 'Code erforderlich.';
      adminCodeMessage.classList.toggle('is-error', false);

      if(isUnlocked){
        renderAdminParameters();
      }
    }

    document
      .getElementById('btn-admin-unlock')
      .addEventListener('click', () => {
        if(adminCodeInput.value === adminCode){
          setAdminUnlocked(true);
          adminCodeInput.value = '';
          return;
        }

        adminCodeMessage.textContent = 'Falscher Code.';
        adminCodeMessage.classList.add('is-error');
      });

    adminCodeInput.addEventListener('keydown', event => {
      if(event.key === 'Enter'){
        document.getElementById('btn-admin-unlock').click();
      }
    });

    document
      .getElementById('btn-admin-money')
      .addEventListener('click', () => {
        if(!adminUnlocked){
          return;
        }

        grantAdminMoney();
        closeSettingsPanel();
      });

    document
      .getElementById('btn-admin-free-upgrades')
      .addEventListener('click', event => {
        if(!adminUnlocked){
          return;
        }

        adminFreeUpgrades = !adminFreeUpgrades;
        const button = event.currentTarget as HTMLButtonElement;
        button.setAttribute('aria-pressed', String(adminFreeUpgrades));
        document.getElementById('admin-free-upgrades-status').textContent = adminFreeUpgrades ? 'Aktiviert' : 'Deaktiviert';
        updateButtons();
      });

    document
      .getElementById('admin-parameters-list')
      .addEventListener('change', event => {
        if(!adminUnlocked){
          return;
        }

        const input = event.target as HTMLInputElement;

        if(!input.matches('.admin-parameter-input')){
          return;
        }

        const value = Number(input.value);

        if(!Number.isFinite(value)){
          return;
        }

        setParameterValue(input.dataset['parameterPath'], value);
        resizeBallsToCurrentArena();
        updateHintMsg();
        updateUI();
        document.getElementById('admin-parameters-message').textContent = `${input.dataset['parameterPath']} gespeichert.`;
      });

    document
      .getElementById('btn-admin-reset-parameters')
      .addEventListener('click', () => {
        if(adminUnlocked && confirm('Alle Parameter auf Standardwerte zurücksetzen?')){
          resetParameters();
        }
      });

    document
      .getElementById('btn-theme')
      .addEventListener('click', () => {
        preferences.theme = preferences.theme === 'dark' ? 'light' : 'dark';
        applyPreferences();
        saveGame();
      });

    document
      .getElementById('btn-color-mode')
      .addEventListener('click', () => {
        preferences.colorMode = preferences.colorMode === 'color' ? 'mono' : 'color';
        applyPreferences();
        saveGame();
      });

    document
      .getElementById('btn-graph')
      .addEventListener('click', () => {
        preferences.graphVisible = !preferences.graphVisible;
        applyPreferences();
        saveGame();
      });

    document
      .getElementById('btn-ball-trails')
      .addEventListener('click', () => {
        preferences.ballTrailsVisible = !preferences.ballTrailsVisible;
        applyPreferences();
        saveGame();
      });

    document
      .getElementById('btn-money-popups')
      .addEventListener('click', () => {
        preferences.moneyPopupsVisible = !preferences.moneyPopupsVisible;
        applyPreferences();
        saveGame();
      });

    document
      .getElementById('btn-reset')
      .addEventListener('click', () => {
        if(confirm('Spielstand wirklich zurücksetzen?')){
          resetGame();
        }
      });

    function updateHintMsg(){
      const maximum = getMaxBalls();
      const current = objects.length;

      const hint =
        document.getElementById('hint-msg');

      if(current >= maximum){
        hint.textContent =
          'Max. Kugeln erreicht – Kapazität kaufen!';
      } else if(replacementBalls.length > 0){
        hint.textContent =
          `${formatCompactNumber(replacementBalls.length)} ersetzte Kugeln warten · Drag/Touch → in gleicher Reihenfolge neu schießen`;
      } else {
        hint.textContent =
          `Drag/Touch → schießen · Tipp/Klick = zufällig (${formatCompactNumber(current)}/${formatCompactNumber(maximum)})`;
      }
    }

    setInterval(saveGame, parameters.ui.autosaveMs);
    window.addEventListener('beforeunload', saveGame);

    applyPreferences();
    updateUI();
    updateHintMsg();
    renderBallsPanel(true);

  }
}
