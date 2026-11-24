/*
 * Carrera por la ría 6 km: Ane corre por el paseo (parte baja) y la ría de Bilbao pasa
 * detrás en capas de parallax. Toca = saltar (mantén = más alto). Esquiva los metros
 * que salen de los "fosteritos", bebe agua para no agotarte y usa el txakoli de turbo.
 */
(function (G) {
  const MG = G.minigames.corredor, CFG = MG.config;
  const lerp = (a, b, t) => a + (b - a) * t;
  const ANE_X = 86;

  class CorredorGame extends Phaser.Scene {
    constructor() { super('CorredorGame'); }

    create() {
      MG.makeTextures(this);
      G.showTiltButton(false);
      const { width: W } = this.scale;
      this.W = W;
      Object.assign(this, {
        dist: 0, time0: 0, elapsed: 0, energy: 100, state: 'run',
        vy: 0, aneY: 0, onGround: true, lastGround: 0, pressAt: -1e9, holding: false, holdT: 0,
        turboUntil: 0, stumbleUntil: 0, invulnUntil: 0, poseUntil: 0, speedMul: 1, frame: 0, frameT: 0,
        obstacles: [], pickups: [], landmarks: {}, lmShown: new Set(), finishSpawned: false,
      });
      this.nextObst = 900; this.nextWater = 700;
      this.txakolis = CFG.TXAKOLI_AT.map(f => (f + Phaser.Math.FloatBetween(-1, 1) * CFG.TXAKOLI_JITTER) * CFG.GOAL_PX);

      // Capas (de fondo a frente)
      this.sky = this.add.graphics().setDepth(0);
      this.clouds = [0, 1, 2, 3].map(i => this.add.image(i * 120 + 40, 0, 'cloud').setDepth(0.5).setScale(0.8 + (i % 2) * 0.4));
      // Montes lejanos (Pagasarri, con bruma) y cercanos (Artxanda, con caseríos); todo a escala 1:1
      const AH = MG.ART_H;
      this.farHills = this.add.tileSprite(0, 0, W, AH.far, 'r-hills-far').setOrigin(0, 1).setDepth(0.8);
      this.hills = this.add.tileSprite(0, 0, W, AH.hills, 'r-hills').setOrigin(0, 1).setDepth(1);
      this.city = this.add.tileSprite(0, 0, W, AH.city, 'r-city').setOrigin(0, 1).setDepth(2);
      this.water = this.add.tileSprite(0, 0, W, 10, 'r-water').setOrigin(0).setDepth(4);
      this.rail = this.add.tileSprite(0, 0, W, AH.rail, 'r-rail').setOrigin(0, 1).setDepth(6);
      this.path = this.add.tileSprite(0, 0, W, AH.path, 'r-path').setOrigin(0).setDepth(5);
      this.garden = this.add.tileSprite(0, 0, W, 10, 'r-garden').setOrigin(0).setDepth(5);

      this.shadow = this.add.ellipse(ANE_X, 0, 36, 8, 0x000000, 0.25).setDepth(9);
      this.ane = G.ui.ane(this, ANE_X, 0, 'runc1', 1).setDepth(10);

      this.buildHud();
      this.layoutAll();
      this.aneY = this.groundY;

      // Entrada: toque en cualquier sitio (los botones HTML no propagan) o espacio / flecha arriba
      this.input.on('pointerdown', () => this.press());
      this.input.on('pointerup', () => { this.holding = false; });
      this.keys = this.input.keyboard.addKeys('SPACE,UP,W');
      ['SPACE', 'UP', 'W'].forEach(k => {
        this.keys[k].on('down', () => this.press());
        this.keys[k].on('up', () => { this.holding = false; });
      });

      const hint = G.ui.text(this, W / 2, this.groundY + 60, '¡Toca para saltar!\nMantén = más alto', 9, '#ffffff', { lineSpacing: 8 }).setDepth(30);
      this.tweens.add({ targets: hint, alpha: 0, delay: 2800, duration: 600, onComplete: () => hint.destroy() });
    }

    /** Coloca todas las capas según el alto actual (también al cambiar de tamaño). */
    layoutAll() {
      const { width: W, height: H } = this.scale;
      this.H = H;
      Object.assign(this, CFG.layout(H));
      const k = this.s, B = MG.backLayout(this);
      MG.drawSky(this.sky, W, this.riaTop + 8);
      this.clouds.forEach((c, i) => (c.y = G.safe.top + 110 + (i % 3) * Math.max(30, (this.riaTop - 260) / 3)));
      this.farHills.y = B.farY; this.farHills.tilePositionX = 180;
      this.hills.y = B.hillsY;
      this.city.y = B.cityY;
      Object.values(this.landmarks).forEach(img => img && img.setScale(1.4 * k).setY(this.riaTop + 6));
      this.water.y = this.riaTop; this.water.height = this.pathTop - this.riaTop;
      this.rail.y = this.pathTop + 2;
      this.path.y = this.pathTop;
      this.garden.y = this.pathTop + 76; this.garden.height = H - this.garden.y;
      this.layoutHud();
    }
    relayout() {
      const old = this.groundY; this.layoutAll(); this.aneY += this.groundY - old;
    }

    // ---------- HUD ----------
    buildHud() {
      this.hud = this.add.graphics().setDepth(40);
      this.lblEnergy = G.ui.text(this, 12, 0, 'ENERGÍA', 8, '#ffffff', { ox: 0, strokeThickness: 3 }).setDepth(41);
      this.icoWater = this.add.image(0, 0, 'r-agua').setDepth(41).setScale(0.7);
      this.lblDist = G.ui.text(this, 12, 0, '', 8, '#ffd23f', { ox: 0, strokeThickness: 3 }).setDepth(41);
      this.icoAne = this.add.image(0, 0, 'ane-run1').setDepth(42).setScale(0.26);
      this.lblTurbo = G.ui.text(this, this.W / 2, 0, '¡TURBO TXAKOLI!', 11, '#ffd23f').setDepth(41).setVisible(false);
      this.lblLand = G.ui.text(this, this.W / 2, 0, '', 12, '#ffffff', { strokeThickness: 5 }).setDepth(41).setAlpha(0);
    }
    layoutHud() {
      const y = G.safe.top + 14;
      this.hudY = y;
      this.lblEnergy.y = y; this.icoWater.setPosition(19, y + 19);
      this.lblDist.y = y + 54; this.lblTurbo.y = y + 86; this.lblLand.y = y + 108;
    }
    drawHud() {
      const y = this.hudY, g = this.hud.clear();
      // barra de energía
      const bx = 30, bw = 160, e = Phaser.Math.Clamp(this.energy / 100, 0, 1);
      const col = e > 0.5 ? 0x3bd16f : e > 0.25 ? 0xffd23f : 0xff3b5c;
      g.fillStyle(0x1b1430, 1).fillRect(bx - 2, y + 12, bw + 4, 14);
      g.fillStyle(0x4a3c66, 1).fillRect(bx, y + 14, bw, 10);
      g.fillStyle(col, 1).fillRect(bx, y + 14, Math.round(bw * e), 10);
      g.fillStyle(0xffffff, 0.35).fillRect(bx, y + 14, Math.round(bw * e), 3);
      if (e <= 0.25 && Math.floor(this.time.now / 200) % 2) g.lineStyle(2, 0xff3b5c, 1).strokeRect(bx - 3, y + 11, bw + 6, 16);
      // progreso hasta San Mamés
      const tx = 12, tw = 230, p = Math.min(1, this.dist / CFG.GOAL_PX), ty = y + 38;
      g.fillStyle(0x1b1430, 1).fillRect(tx - 2, ty - 2, tw + 4, 8);
      g.fillStyle(0x9fd3ff, 1).fillRect(tx, ty, tw, 4);
      g.fillStyle(0xf05a3c, 1).fillRect(tx, ty, Math.round(tw * p), 4);
      g.fillStyle(0x1b1430, 1).fillRect(tx + tw, ty - 14, 2, 18);
      g.fillStyle(0xff3b5c, 1).fillRect(tx + tw + 2, ty - 14, 10, 4);
      g.fillStyle(0xffffff, 1).fillRect(tx + tw + 2, ty - 10, 10, 3);
      this.icoAne.setPosition(tx + tw * p, ty - 2);
      const left = Math.max(0, CFG.GOAL_M * (1 - p));
      this.lblDist.setText(`San Mamés: ${(left / 1000).toFixed(1).replace('.', ',')} km`);
    }

    // ---------- Entrada ----------
    press() {
      if (this.state !== 'run') return;
      this.pressAt = this.time.now;
      this.holding = true;
      this.tryJump();
    }
    tryJump() {
      const now = this.time.now;
      const canJump = this.onGround || now - this.lastGround < CFG.COYOTE_MS;
      if (!canJump || now - this.pressAt > CFG.BUFFER_MS || now < this.stumbleUntil) return;
      this.vy = -CFG.JUMP_V; this.onGround = false; this.lastGround = -1e9; this.holdT = 0; this.pressAt = -1e9;
      G.sfx.jump();
    }
    isHeld() {
      return this.holding && (this.input.activePointer.isDown || this.input.manager.pointers.some(p => p.isDown) ||
        this.keys.SPACE.isDown || this.keys.UP.isDown || this.keys.W.isDown);
    }

    // ---------- Bucle ----------
    update(time, delta) {
      const dt = Math.min(delta, 50) / 1000;
      if (!this.time0) this.time0 = time;
      this.elapsed += delta;
      const prog = Math.min(1, this.dist / CFG.GOAL_PX);
      const turbo = time < this.turboUntil;

      // velocidad del mundo
      let target = lerp(CFG.SPEED[0], CFG.SPEED[1], prog) * (turbo ? CFG.TURBO_MULT : 1);
      if (this.state !== 'run') target = 0;
      this.speedMul = Math.min(1, this.speedMul + dt * 0.8);
      const v = this.state === 'run' ? target * this.speedMul : Math.max(0, (this.v || 0) - 420 * dt);
      this.v = v;
      const dd = v * dt;
      this.dist = Math.min(CFG.GOAL_PX, this.dist + dd);

      // parallax
      const P = CFG.PARALLAX;
      this.hills.tilePositionX = this.dist * P.hills;
      this.farHills.tilePositionX = 180 + this.dist * P.hills * 0.4;
      this.city.tilePositionX = this.dist * P.city;
      this.water.tilePositionX = this.dist * P.water + time * 0.01;
      this.rail.tilePositionX = this.dist; this.path.tilePositionX = this.dist; this.garden.tilePositionX = this.dist;
      this.clouds.forEach((c, i) => { c.x -= (dd * 0.03 + dt * 4) * (1 + i * 0.2); if (c.x < -50) c.x = this.W + 50; });
      this.updateLandmarks();

      // física de Ane
      if (!this.onGround) {
        const held = this.isHeld() && this.vy < 0 && this.holdT < CFG.HOLD_MS;
        if (held) this.holdT += delta;
        this.vy += CFG.GRAVITY * (held ? CFG.HOLD_GRAVITY : 1) * dt;
        this.aneY += this.vy * dt;
        if (this.aneY >= this.groundY) { this.aneY = this.groundY; this.vy = 0; this.onGround = true; this.lastGround = time; this.tryJump(); }
      } else this.lastGround = time;
      this.ane.y = this.aneY; this.ane.x = ANE_X;
      this.shadow.setPosition(ANE_X, this.groundY).setScale(1 - Math.min(0.6, (this.groundY - this.aneY) / 200));

      if (this.state === 'run') {
        // energía
        if (!turbo) this.energy -= lerp(CFG.DRAIN[0], CFG.DRAIN[1], prog) * dt;
        if (this.energy <= 0) { this.energy = 0; this.exhausted(); }
        this.spawn();
        if (this.dist >= CFG.GOAL_PX) this.win();
      }
      if (this.finishImg) {
        const fx = ANE_X + 14 + (CFG.GOAL_PX - this.dist);
        this.finishImg.setPosition(fx, this.groundY + 20); this.finishArch.setPosition(fx, this.groundY - 110);
      }
      this.updateObstacles(dt, time, turbo);
      this.updatePickups(time);
      this.animateAne(time, delta, turbo);
      this.lblTurbo.setVisible(turbo && this.state === 'run');
      if (turbo) this.speedLines();
      this.drawHud();
    }

    animateAne(time, delta, turbo) {
      const a = this.ane;
      if (this.state === 'tired') return a.setPose('tired');
      if (this.state === 'win') return;
      if (time < this.stumbleUntil) a.setPose('tired');
      else if (!this.onGround) a.setPose('rjump');
      else if (time < this.poseUntil) a.setPose('drink');
      else {
        // ciclo de 4 frames (contacto, bajada, paso, vuelo) = un paso. Cadencia de corredora real (~175 pasos/min
        // a velocidad normal, más rápida con turbo): con menos, las piernas iban a cámara lenta y los pies patinaban
        this.frameT += delta;
        const fd = Phaser.Math.Clamp(21000 / Math.max(1, this.v), 58, 100);
        while (this.frameT > fd) { this.frameT -= fd; this.frame = (this.frame + 1) % 4; }
        a.setPose('runc' + (this.frame + 1));
      }
      a.alpha = time < this.invulnUntil && !turbo ? (Math.floor(time / 80) % 2 ? 0.35 : 1) : 1;
      a.each(i => (turbo ? i.setTint(Math.floor(time / 90) % 2 ? 0xffe680 : 0xffffff) : i.clearTint()));
    }

    // ---------- Monumentos ----------
    updateLandmarks() {
      const f = CFG.PARALLAX.landmarks;
      CFG.LANDMARKS.forEach(L => {
        const center = L.at * CFG.GOAL_PX;
        const x = this.W / 2 + (center - this.dist) * f;
        let img = this.landmarks[L.key];
        const w = (img && img.displayWidth) || 560;
        if (!img && x - w / 2 < this.W + 20 && x + w / 2 > -20) {
          img = this.landmarks[L.key] = this.add.image(x, this.riaTop + 6, 'r-' + L.key).setOrigin(0.5, 1).setDepth(3).setScale(1.4 * this.s);
        }
        if (!img) return;
        img.x = Math.round(x); img.y = this.riaTop + 6;
        if (!this.lmShown.has(L.key) && Math.abs(x - this.W / 2) < 30) { this.lmShown.add(L.key); this.showLandmark(L.name); }
        if (x + w / 2 < -40 && L.key !== 'sanmames') { img.destroy(); this.landmarks[L.key] = null; }
      });
    }
    showLandmark(name) {
      this.lblLand.setText(name).setAlpha(1);
      this.tweens.killTweensOf(this.lblLand);
      this.tweens.add({ targets: this.lblLand, alpha: 0, delay: 1600, duration: 500 });
    }

    // ---------- Obstáculos y objetos ----------
    spawn() {
      const ahead = this.dist + this.W + 140, prog = this.dist / CFG.GOAL_PX;
      if (ahead > this.nextObst && this.nextObst < CFG.GOAL_PX - 700) {
        const at = this.nextObst;
        const fos = this.add.image(0, 0, 'r-fosterito').setOrigin(0.5, 1).setFlipX(true).setDepth(7);
        const n = prog > CFG.DOUBLE_FROM && Math.random() < lerp(CFG.DOUBLE_P[0], CFG.DOUBLE_P[1], prog) ? 2 : 1;
        const warn = G.ui.text(this, 0, 0, '!', 16, '#ff3b5c').setDepth(8);
        const extra = lerp(CFG.TRAIN_EXTRA[0], CFG.TRAIN_EXTRA[1], prog) * Phaser.Math.FloatBetween(...CFG.TRAIN_JITTER);
        // separación entre vagones: aleatoria pero con tope para que el tren largo siempre se pueda saltar
        const gapMs = Math.min(Phaser.Math.Between(...CFG.DOUBLE_MS), (CFG.DOUBLE_MAX_PX / extra) * 1000);
        this.obstacles.push({ at, fos, warn, trains: [], toLaunch: n, launchT: Phaser.Math.Between(...CFG.LAUNCH_DELAY_MS), gapMs, extra });
        const gap = CFG.OBST_GAP.map(r => r);
        this.nextObst += Phaser.Math.Between(lerp(gap[0][0], gap[1][0], prog), lerp(gap[0][1], gap[1][1], prog)) + (n - 1) * 240;
      }
      if (ahead > this.nextWater && this.nextWater < CFG.GOAL_PX - 400) {
        this.addPickup('agua', this.avoidObst(this.nextWater), Math.random() < 0.5 ? 'low' : 'high');
        this.nextWater += Phaser.Math.Between(...CFG.WATER_GAP);
      }
      if (!this.finishImg && ahead > CFG.GOAL_PX) {
        this.finishImg = this.add.tileSprite(0, 0, 24, 44, 'r-finish').setOrigin(0.5, 1).setDepth(5.5);
        this.finishArch = G.ui.text(this, 0, 0, 'META', 10, '#ffffff').setDepth(8);
      }
      if (this.txakolis.length && ahead > this.txakolis[0]) this.addPickup('txakoli', this.avoidObst(this.txakolis.shift()), 'high');
    }
    avoidObst(d) {
      for (const o of this.obstacles) if (Math.abs(o.at - d) < 220) d = o.at + 260;
      return d;
    }
    addPickup(kind, at, h) {
      const img = this.add.image(0, 0, 'r-' + kind).setDepth(9).setScale(1.1);
      const glow = this.add.circle(0, 0, 16, kind === 'agua' ? 0x9fe3ff : 0xffe066, 0.35).setDepth(8.9);
      this.pickups.push({ kind, at, img, glow, hy: h === 'low' ? 30 : 118, phase: Math.random() * 6 });
    }

    updateObstacles(dt, time, turbo) {
      const W = this.W;
      this.obstacles = this.obstacles.filter(o => {
        const fx = ANE_X + (o.at - this.dist);
        o.fos.setPosition(fx, this.groundY - 6);
        o.warn.setPosition(fx - 30, this.groundY - 92).setVisible(o.toLaunch > 0 && Math.floor(time / 150) % 2 === 0);
        // el metro "sale" del fosterito cuando éste entra en pantalla
        if (o.toLaunch > 0 && fx < W - 8) {
          o.launchT -= dt * 1000;
          if (o.launchT <= 0) {
            const tr = this.add.image(fx, this.groundY + 2, 'r-metro').setOrigin(0.5, 1).setFlipX(true).setDepth(6.5);
            o.trains.push({ img: tr, off: 0, hit: false }); o.toLaunch--; o.launchT = o.gapMs;
            if (this.state === 'run') G.sfx.drop();
          }
        }
        o.trains = o.trains.filter(t => {
          if (t.flying) return true;
          t.off += o.extra * dt;
          t.img.x = fx - t.off; t.img.y = this.groundY + 2;
          if (t.img.x < fx - o.fos.width / 2 - 10) t.img.setDepth(8);
          if (!t.hit && this.state === 'run') this.checkHit(t, turbo, time);
          if (t.img.x < -120) { t.img.destroy(); return false; }
          return true;
        });
        if (fx < -80 && o.trains.length === 0 && o.toLaunch === 0) { o.fos.destroy(); o.warn.destroy(); return false; }
        return true;
      });
    }

    checkHit(t, turbo, time) {
      const img = t.img, hw = img.width / 2 - 10;
      const top = this.groundY + 2 - img.height + 8;
      const ax0 = ANE_X - 13, ax1 = ANE_X + 13, ay0 = this.aneY - 78, ay1 = this.aneY;
      if (ax1 < img.x - hw || ax0 > img.x + hw || ay1 < top || ay0 > this.groundY) return;
      t.hit = true;
      if (turbo) {     // con turbo, ¡el metro sale volando!
        t.flying = true; G.sfx.hit();
        this.floatText(ANE_X + 30, this.aneY - 100, '¡ZAS!', '#ffd23f');
        this.tweens.add({ targets: img, x: img.x + 220, y: img.y - 260, angle: 200, duration: 700, onComplete: () => img.destroy() });
        return;
      }
      if (time < this.invulnUntil) return;
      G.sfx.hit();
      this.energy -= CFG.HIT;
      this.speedMul = 0.45;
      this.stumbleUntil = time + CFG.STUMBLE_MS; this.invulnUntil = time + CFG.INVULN_MS;
      this.cameras.main.shake(140, 0.008);
      this.floatText(ANE_X + 20, this.aneY - 110, `-${CFG.HIT} energía`, '#ff5a5a');
    }

    updatePickups(time) {
      this.pickups = this.pickups.filter(p => {
        const x = ANE_X + (p.at - this.dist), y = this.groundY - p.hy + Math.sin(time / 200 + p.phase) * 4;
        p.img.setPosition(x, y); p.glow.setPosition(x, y).setScale(1 + Math.sin(time / 150) * 0.15);
        const ay = this.aneY - 46;
        if (this.state === 'run' && Math.abs(x - ANE_X) < 26 && Math.abs(y - ay) < 50) {
          this.collect(p, time); p.img.destroy(); p.glow.destroy(); return false;
        }
        if (x < -30) { p.img.destroy(); p.glow.destroy(); return false; }
        return true;
      });
    }
    collect(p, time) {
      if (p.kind === 'agua') {
        G.sfx.drink();
        this.energy = Math.min(100, this.energy + CFG.WATER);
        if (this.onGround) this.poseUntil = time + 350;
        this.floatText(ANE_X + 20, this.aneY - 110, `+${CFG.WATER} agua`, '#9fe3ff');
      } else {
        G.sfx.turbo();
        this.turboUntil = time + CFG.TURBO_MS;
        this.energy = Math.min(100, this.energy + 10);
        this.floatText(ANE_X + 30, this.aneY - 110, '¡TXAKOLI!', '#ffd23f');
      }
      this.sparkles(ANE_X, this.aneY - 50, p.kind === 'agua' ? 0x9fe3ff : 0xffe066);
    }

    // ---------- Efectos ----------
    floatText(x, y, str, color) {
      const t = G.ui.text(this, x, y, str, 9, color).setDepth(35);
      t.x = Phaser.Math.Clamp(x, t.width / 2 + 4, this.W - t.width / 2 - 4);
      this.tweens.add({ targets: t, y: y - 36, alpha: 0, duration: 900, onComplete: () => t.destroy() });
    }
    sparkles(x, y, color) {
      for (let i = 0; i < 8; i++) {
        const s = this.add.rectangle(x, y, 3, 3, color).setDepth(34);
        const a = (i / 8) * Math.PI * 2;
        this.tweens.add({ targets: s, x: x + Math.cos(a) * 30, y: y + Math.sin(a) * 30, alpha: 0, duration: 450, onComplete: () => s.destroy() });
      }
    }
    speedLines() {
      if (Math.random() > 0.4) return;
      const y = Phaser.Math.Between(this.groundY - 90, this.groundY - 6);
      const l = this.add.rectangle(ANE_X - 20, y, Phaser.Math.Between(16, 34), 2, 0xffffff, 0.8).setDepth(9);
      this.tweens.add({ targets: l, x: l.x - 90, alpha: 0, duration: 260, onComplete: () => l.destroy() });
    }

    // ---------- Final ----------
    exhausted() {
      if (this.state !== 'run') return;
      this.state = 'tired';
      G.sfx.lifeLost();
      this.aneY = this.groundY; this.vy = 0; this.onGround = true;
      G.ui.text(this, this.W / 2, this.groundY - 150, '¡Agotada!', 18, '#ff5a5a', { strokeThickness: 6 }).setDepth(36);
      this.time.delayedCall(1700, () => this.scene.start('CorredorEnd', { win: false, km: (this.dist / CFG.GOAL_PX) * CFG.GOAL_M / 1000 }));
    }
    win() {
      if (this.state !== 'run') return;
      this.state = 'win';
      const secs = Math.round(this.elapsed / 1000);
      G.progress.recordScore(CFG.id, Math.max(1, 999 - secs));
      G.progress.complete(CFG.id);
      G.sfx.win();
      this.time.delayedCall(250, () => { this.ane.setPose('celebrate'); this.ane.setScale(0.82); });
      G.ui.text(this, this.W / 2, this.groundY - 160, '¡META!', 22, '#ffd23f', { strokeThickness: 7 }).setDepth(36);
      this.time.delayedCall(1800, () => this.scene.start('CorredorEnd', { win: true, secs }));
    }
  }
  MG.scenes.push(CorredorGame);
})(window.AneGame);
