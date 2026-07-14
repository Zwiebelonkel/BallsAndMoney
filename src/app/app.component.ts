import { AfterViewInit, Component, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html'
})
export class AppComponent implements AfterViewInit, OnDestroy {
  private cleanupCallbacks: Array<() => void> = [];

  ngAfterViewInit(): void {
    this.startGame();
  }

  ngOnDestroy(): void {
    for (const cleanup of this.cleanupCallbacks) {
      cleanup();
    }
  }

  private startGame(): void {


    const canvas = document.getElementById('c');
    const ctx = canvas.getContext('2d');
    const wrap = document.getElementById('canvas-wrap');

    let W = 0;
    let H = 0;
    let objects = [];

    const MAX_DEVICE_PIXEL_RATIO = 2;

    function resize(){
      const previousW = W || wrap.clientWidth || 1;
      const previousH = H || wrap.clientHeight || 1;

      W = Math.max(1, wrap.clientWidth);
      H = Math.max(1, wrap.clientHeight);

      const devicePixelRatio = Math.min(
        window.devicePixelRatio || 1,
        MAX_DEVICE_PIXEL_RATIO
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

      if(objects.length > 0){
        const scaleX = W / previousW;
        const scaleY = H / previousH;

        for(const ball of objects){
          ball.x = Math.max(ball.r, Math.min(W - ball.r, ball.x * scaleX));
          ball.y = Math.max(ball.r, Math.min(H - ball.r, ball.y * scaleY));
          ball.trail = [];
        }
      }
    }

    resize();

    new ResizeObserver(resize).observe(wrap);


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

    const SAVE_KEY = 'ballsAndMoneySave';

    const preferences = {
      theme: 'dark',
      colorMode: 'color',
      graphVisible: true
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
    }

    const state = {
      coins: 0,
      colPerSec: 0,
      moneyPerSec: 0,
      lastColT: performance.now(),
      colCount: 0,
      moneyCount: 0,
      prestige: 0,
      comboCount: 0,
      lastComboT: 0
    };

    const upgradeConfig = {
      size: {
        baseCost: 90,
        growth: 2.25
      },
      mult: {
        baseCost: 180,
        growth: 1.9
      },
      cap: {
        baseCost: 260,
        growth: 1.85
      },
      combo: {
        baseCost: 320,
        growth: 2.05
      },
      launch: {
        baseCost: 110,
        growth: 2.15
      }
    };

    const upgrades = {
      size: 0,
      mult: 0,
      cap: 0,
      combo: 0,
      launch: 0
    };

    function getCost(key, level){
      const config = upgradeConfig[key];

      if(config === undefined){
        console.error(`Kein Preis für Upgrade "${key}" definiert.`);
        return Infinity;
      }

      return Math.round(
        config.baseCost * Math.pow(config.growth, level)
      );
    }

    function getArenaScale(ballCount = objects.length){
      return 1 + Math.floor(ballCount / 5) * 0.85;
    }

    function getBaseR(ballCount = objects.length){
      return (14 + upgrades.size * 1.5) / getArenaScale(ballCount);
    }

    function resizeBallsToCurrentArena(){
      for(const ball of objects){
        ball.r = getBaseR() * (0.85 + Math.random() * 0.3);
        ball.m = ball.r * ball.r * 0.01;
        ball.x = Math.max(ball.r, Math.min(W - ball.r, ball.x));
        ball.y = Math.max(ball.r, Math.min(H - ball.r, ball.y));
        ball.trail = [];
      }
    }

    function getGlobalMoneyMult(){
      return 1 + (state.prestige || 0) * 0.35;
    }

    function getCoinMult(){
      return (1 + upgrades.mult * 0.55) * getGlobalMoneyMult();
    }

    function getMaxBalls(){
      return 4 + upgrades.cap;
    }

    function getComboLevel(){
      return upgrades.combo;
    }

    function getLaunchPowerMultiplier(){
      return 0.55 * Math.pow(1.18, upgrades.launch);
    }

    let objectIndex = 0;
    let saveTimer = 0;

    function getSaveData(){
      return {
        version: 1,
        state: {
          coins: state.coins,
          prestige: state.prestige || 0
        },
        upgrades: { ...upgrades },
        preferences: { ...preferences },
        arena: {
          w: W,
          h: H
        },
        hueIdx,
        objectIndex,
        objects: objects.map(ball => ({
          id: ball.id,
          x: ball.x,
          y: ball.y,
          vx: ball.vx,
          vy: ball.vy,
          r: ball.r,
          m: ball.m,
          col: ball.col
        }))
      };
    }

    function saveGame(){
      localStorage.setItem(SAVE_KEY, JSON.stringify(getSaveData()));
    }

    function queueSave(){
      clearTimeout(saveTimer);

      saveTimer = setTimeout(saveGame, 250);
    }

    function loadGame(){
      const raw = localStorage.getItem(SAVE_KEY);

      if(!raw){
        return false;
      }

      try{
        const data = JSON.parse(raw);

        if(data.state && Number.isFinite(data.state.coins)){
          state.coins = data.state.coins;
        }

        if(data.state && Number.isFinite(data.state.prestige)){
          state.prestige = data.state.prestige;
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

        if(data.arena){
          resize();
        }

        hueIdx = Number.isFinite(data.hueIdx) ? data.hueIdx : hueIdx;
        objectIndex = Number.isFinite(data.objectIndex) ? data.objectIndex : objectIndex;

        if(Array.isArray(data.objects)){
          objects = data.objects
            .filter(ball => Number.isFinite(ball.x) && Number.isFinite(ball.y))
            .map(ball => ({
              id: Number.isFinite(ball.id) ? ball.id : objectIndex++,
              x: ball.x,
              y: ball.y,
              vx: Number.isFinite(ball.vx) ? ball.vx : 0,
              vy: Number.isFinite(ball.vy) ? ball.vy : 0,
              r: Number.isFinite(ball.r) ? ball.r : getBaseR(),
              m: Number.isFinite(ball.m) ? ball.m : getBaseR() * getBaseR() * 0.01,
              col: ball.col || COLORS[hueIdx % COLORS.length],
              trail: []
            }));

          for(const ball of objects){
            ball.x = Math.max(ball.r, Math.min(W - ball.r, ball.x));
            ball.y = Math.max(ball.r, Math.min(H - ball.r, ball.y));
          }
        }

        return true;
      } catch(error){
        console.error('Spielstand konnte nicht geladen werden.', error);
        localStorage.removeItem(SAVE_KEY);
        return false;
      }
    }

    function resetGame(){
      localStorage.removeItem(SAVE_KEY);
      state.coins = 0;
      state.colPerSec = 0;
      state.moneyPerSec = 0;
      state.colCount = 0;
      state.moneyCount = 0;
      state.prestige = 0;
      state.comboCount = 0;
      state.lastComboT = 0;

      for(const key of Object.keys(upgrades)){
        upgrades[key] = 0;
      }

      preferences.theme = 'dark';
      preferences.colorMode = 'color';
      preferences.graphVisible = true;
      objects = [];
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

    function mkBall(x, y, vx = 0, vy = 0){
      const r = getBaseR() * (0.85 + Math.random() * 0.3);
      const col = COLORS[hueIdx % COLORS.length];

      hueIdx++;

      const mass = r * r * 0.01;

      return {
        id: objectIndex++,
        x,
        y,
        vx,
        vy,
        r,
        m: mass,
        col,
        trail: []
      };
    }

    function spawnRandom(){
      if(objects.length >= getMaxBalls()){
        return false;
      }

      const r = getBaseR();

      const x = r + Math.random() * Math.max(1, W - r * 2);
      const y = r + Math.random() * Math.max(1, H / 2 - r);

      const angle = Math.random() * Math.PI * 2;
      const speed = (2 + Math.random() * 3) * getLaunchPowerMultiplier();

      const previousArenaScale = getArenaScale();

      objects.push(
        mkBall(
          x,
          y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed
        )
      );

      if(getArenaScale() !== previousArenaScale){
        resizeBallsToCurrentArena();
      }

      return true;
    }

    /* Diagramme */

    const GRAPH_LENGTH = 120;
    const collisionHistory = new Array(GRAPH_LENGTH).fill(0);
    const moneyHistory = new Array(GRAPH_LENGTH).fill(0);

    let collisionMax = 0;
    let collisionSum = 0;
    let collisionSamples = 0;
    let moneyMax = 0;
    let moneySum = 0;
    let moneySamples = 0;

    const collisionGraphCanvas = document.getElementById('collision-graph');
    const collisionGraphCtx = collisionGraphCanvas.getContext('2d');
    const moneyGraphCanvas = document.getElementById('money-graph');
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
        const x = index / (GRAPH_LENGTH - 1) * GW;
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
        const x = index / (GRAPH_LENGTH - 1) * GW;
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

      if(history.length > GRAPH_LENGTH){
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
        state.colPerSec.toLocaleString('de-DE', { maximumFractionDigits: 1 });
      document.getElementById('dash-collisions-max').textContent =
        collisionMax.toLocaleString('de-DE', { maximumFractionDigits: 1 });
      document.getElementById('dash-collisions-avg').textContent =
        collisionAverage.toLocaleString('de-DE', { maximumFractionDigits: 1 });
      document.getElementById('dash-n').textContent = objects.length;

      document.getElementById('dash-money').textContent =
        state.moneyPerSec.toLocaleString('de-DE', { maximumFractionDigits: 0 });
      document.getElementById('dash-money-max').textContent =
        moneyMax.toLocaleString('de-DE', { maximumFractionDigits: 0 });
      document.getElementById('dash-money-avg').textContent =
        moneyAverage.toLocaleString('de-DE', { maximumFractionDigits: 0 });
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

    const MAX_DRAG = 160;

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

      if(distance < 4){
        const angle = Math.random() * Math.PI * 2;
        const speed = (2 + Math.random() * 3) * getLaunchPowerMultiplier();

        objects.push(
          mkBall(
            drag.startX,
            drag.startY,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed
          )
        );
      } else {
        const clamped = Math.min(distance, MAX_DRAG);
        const speed =
          clamped / MAX_DRAG *
          14 *
          getLaunchPowerMultiplier();

        objects.push(
          mkBall(
            drag.startX,
            drag.startY,
            dx / distance * speed,
            dy / distance * speed
          )
        );
      }

      if(getArenaScale() !== previousArenaScale){
        resizeBallsToCurrentArena();
      }

      updateHintMsg();
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
      if(ball.x - ball.r < 0){
        ball.x = ball.r;
        ball.vx = Math.abs(ball.vx);
      }

      if(ball.x + ball.r > W){
        ball.x = W - ball.r;
        ball.vx = -Math.abs(ball.vx);
      }

      if(ball.y - ball.r < 0){
        ball.y = ball.r;
        ball.vy = Math.abs(ball.vy);
      }

      if(ball.y + ball.r > H){
        ball.y = H - ball.r;
        ball.vy = -Math.abs(ball.vy);
      }
    }

    function collide(){
      for(let i = 0; i < objects.length; i++){
        for(let j = i + 1; j < objects.length; j++){

          const a = objects[i];
          const b = objects[j];

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

          onCollision(
            (a.x + b.x) / 2,
            (a.y + b.y) / 2
          );
        }
      }
    }

    /* Belohnungen */

    function onCollision(x, y){
      state.colCount++;

      const now = performance.now();

      let earnedCoins = getCoinMult();

      if(getComboLevel() > 0){

        if(now - state.lastComboT < 600){
          state.comboCount = Math.min(
            state.comboCount + 1,
            20
          );
        } else {
          state.comboCount = 1;
        }

        state.lastComboT = now;

        if(state.comboCount >= 3){
          const bonus =
            1 +
            (state.comboCount - 2) *
            0.1 *
            getComboLevel();

          earnedCoins *= bonus;

          document.getElementById('combo-val').textContent =
            bonus.toFixed(1);

          document.getElementById('combo-pill').style.opacity = '1';

          setTimeout(() => {
            document.getElementById('combo-pill').style.opacity = '0';
          }, 1200);
        }
      }

      earnedCoins = Math.ceil(earnedCoins);

      state.coins += earnedCoins;
      state.moneyCount += earnedCoins;

      spawnFloat(x, y, earnedCoins);
      updateUI();
    }

    function spawnFloat(x, y, value){
      const element = document.createElement('div');

      element.className = 'float-text';
      element.textContent = '+' + value;
      const rect = canvas.getBoundingClientRect();

      element.style.left = x * (rect.width / W) + 'px';
      element.style.top = y * (rect.height / H) + 'px';

      document
        .getElementById('float-coins')
        .appendChild(element);

      setTimeout(() => {
        element.remove();
      }, 1200);
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

    function drawBall(ball){
      if(ball.trail.length > 1){
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

      ctx.beginPath();
      ctx.arc(
        ball.x,
        ball.y,
        ball.r,
        0,
        Math.PI * 2
      );

      const color = displayColor(ball.col);

      ctx.fillStyle = color + 'dd';
      ctx.fill();

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

    const FRAME_MS = 16.67;
    const MAX_SIMULATION_DELTA = 3;
    const MAX_CATCH_UP_MS = 30000;

    let lastTime = performance.now();
    let lastBackgroundTime = lastTime;
    function simulateStep(delta, shouldDraw){
      for(const ball of objects){
        ball.x += ball.vx * delta;
        ball.y += ball.vy * delta;

        wallBounce(ball);

        if(shouldDraw){
          ball.trail.push({
            x: ball.x,
            y: ball.y
          });

          if(ball.trail.length > 18){
            ball.trail.shift();
          }
        }
      }

      collide();
    }

    function simulateElapsed(elapsedMs, shouldDraw){
      const cappedElapsedMs = Math.min(
        Math.max(elapsedMs, 0),
        MAX_CATCH_UP_MS
      );

      let remainingDelta = cappedElapsedMs / FRAME_MS;

      while(remainingDelta > 0){
        const delta = Math.min(
          remainingDelta,
          MAX_SIMULATION_DELTA
        );

        simulateStep(delta, shouldDraw && remainingDelta <= MAX_SIMULATION_DELTA);
        remainingDelta -= delta;
      }
    }

    function drawFrame(){
      ctx.fillStyle = cssVar('--bg');
      ctx.fillRect(0, 0, W, H);

      drawGrid();

      for(const ball of objects){
        drawBall(ball);
      }

      drawDashboard();
    }

    function updateCollisionRate(now){
      if(now - state.lastColT <= 800){
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
        state.colPerSec.toFixed(1);
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
      drawFrame();

      if(drag.active){
        const dx = drag.startX - drag.x;
        const dy = drag.startY - drag.y;

        const distance = Math.sqrt(
          dx * dx +
          dy * dy
        );

        if(distance > 4){
          const clamped = Math.min(distance, MAX_DRAG);
          const power = clamped / MAX_DRAG;
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

    function updateUI(){
      document.getElementById('coins-val').textContent =
        Math.floor(state.coins).toLocaleString('de-DE');

      updateButtons();
      queueSave();
    }

    function getBallCost(){
      return Math.floor(
        35 *
        Math.pow(
          1.72,
          Math.max(0, objects.length - 3)
        )
      );
    }

    function updateButtons(){
      const coins = state.coins;

      const ballCost = getBallCost();
      const reachedMaximum =
        objects.length >= getMaxBalls();

      const spawnButton =
        document.getElementById('btn-spawn');

      spawnButton.disabled =
        coins < ballCost ||
        reachedMaximum;

      spawnButton.className =
        'upgrade-btn' +
        (
          coins >= ballCost &&
          !reachedMaximum
            ? ' can-afford'
            : ''
        );

      document.getElementById('cost-spawn').textContent =
        reachedMaximum
          ? `Max (${getMaxBalls()})`
          : ballCost + ' 🪙';

      function updateUpgradeButton(key, buttonId, costId){
        const level = upgrades[key];
        const cost = getCost(key, level);

        const button =
          document.getElementById(buttonId);

        const costElement =
          document.getElementById(costId);

        const maxed = cost === Infinity;

        button.disabled =
          maxed ||
          coins < cost;

        button.className =
          'upgrade-btn' +
          (
            !maxed &&
            coins >= cost
              ? ' can-afford'
              : ''
          );

        if(maxed){
          costElement.textContent = 'MAX ✓';
          costElement.className = 'btn-cost maxed';
        } else {
          costElement.textContent = cost + ' 🪙';
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

      const prestigeButton = document.getElementById('btn-prestige');
      const prestigeCostElement = document.getElementById('cost-prestige');
      const prestigeCost = getPrestigeCost();

      prestigeButton.disabled = coins < prestigeCost;
      prestigeButton.className =
        'upgrade-btn' + (coins >= prestigeCost ? ' can-afford' : '');
      prestigeCostElement.textContent =
        prestigeCost.toLocaleString('de-DE') +
        ` 🪙 → Global x${getNextGlobalMoneyMult().toLocaleString('de-DE', { maximumFractionDigits: 2 })}`;
    }

    function getPrestigeCost(){
      return 5000000;
    }

    function getNextGlobalMoneyMult(){
      return 1 + ((state.prestige || 0) + 1) * 0.35;
    }

    function performPrestige(){
      if(state.coins < getPrestigeCost()){
        return;
      }

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
    }

    function buy(cost, action){
      if(
        !Number.isFinite(cost) ||
        state.coins < cost
      ){
        return;
      }

      state.coins -= cost;

      action();
      updateUI();
    }

    /* Shop-Buttons */

    document
      .getElementById('btn-spawn')
      .addEventListener('click', () => {
        const cost = getBallCost();

        buy(cost, () => {
          spawnRandom();
          updateHintMsg();
        });
      });

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
      .getElementById('btn-prestige')
      .addEventListener('click', () => {
        if(confirm('Prestige durchführen? Dein aktueller Run wird zurückgesetzt, aber der globale Geld-Multiplikator steigt permanent.')){
          performPrestige();
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
      } else {
        hint.textContent =
          `Drag/Touch → schießen · Tipp/Klick = zufällig (${current}/${maximum})`;
      }
    }

    setInterval(saveGame, 5000);
    window.addEventListener('beforeunload', saveGame);

    applyPreferences();
    updateUI();
    updateHintMsg();

  }
}
