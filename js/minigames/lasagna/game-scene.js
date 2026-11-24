/* Partida de "Torre de lasagna": tocar para soltar cada capa; lo que sobresale se corta. */
(function (G) {
  const MG = G.minigames.lasagna, CFG = MG.config;
  const KEY = { pasta: 'ls-pasta', ragu: 'ls-ragu', bech: 'ls-bech' };
  const NAME = { pasta: 'pasta', ragu: 'ragú', bech: 'bechamel' };
  const LH = CFG.LAYER_H;

  class LasagnaGame extends Phaser.Scene {
    constructor() { super('LasagnaGame'); }

    create() {
      MG.makeTextures(this);
      G.showTiltButton(false);
      Object.assign(this, {
        stack: [], moving: null, dir: 1, speed: CFG.SPEED0, state: 'slide',
        perfects: 0, streak: 0, lastTap: 0, elapsed: 0, over: false,
      });
      this.W = this.scale.width; this.H = this.scale.height;
      const bg = MG.drawBackdrop(this, 0.12);
      bg.img.setScrollFactor(0); if (bg.shade) bg.shade.setScrollFactor(0);
      // world: fuente + capas (se desplaza hacia abajo al crecer). Orden de dibujo:
      // sombra, interior de la fuente, capas, contornos, frente de la fuente y, encima, trozos y vapor.
      this.world = this.add.container(0, 0).setDepth(5);
      this.computeBase();
      const cx = this.W / 2;
      this.dishShadow = this.add.image(cx, this.baseY + 34, 'ls-shadow').setScale((CFG.START_W + 60) / 64, 1.6);
      this.dishBack = this.add.image(cx, this.baseY - 16, 'ls-dish_back').setOrigin(0.5, 0);
      this.layers = this.add.container(0, 0);
      this.edges = this.add.graphics();
      this.dish = this.add.image(cx, this.baseY - 8, 'ls-dish').setOrigin(0.5, 0);
      this.world.add([this.dishShadow, this.dishBack, this.layers, this.edges, this.dish]);
      // capa 0 "virtual": el fondo de la fuente
      this.stack.push({ x: cx - CFG.START_W / 2, w: CFG.START_W, y: this.baseY, s: null });

      this.buildHud();
      this.newLayer();

      this.input.on('pointerdown', () => this.drop());   // segundo dedo / doble toque: lo frena el estado + 160 ms
      this.input.keyboard.on('keydown-SPACE', () => this.drop());
      this.input.keyboard.on('keydown-ENTER', () => this.drop());
      this.showBanner('Toca para soltar\ncada capa', 1500);
    }

    computeBase() { this.baseY = this.H - G.safe.bottom - Math.max(64, this.H * 0.11); }
    relayout() {
      const old = this.baseY;
      this.H = this.scale.height; this.computeBase();
      this.world.y += this.baseY - old;
      this.placeHud();
    }

    buildHud() {
      this.lbl = G.ui.text(this, this.W / 2, 0, '', 13, '#ffd23f', { strokeThickness: 6 }).setDepth(90);
      this.lblSub = G.ui.text(this, this.W / 2, 0, '', 10, '#ffffff', { strokeThickness: 4 }).setDepth(90);
      this.bar = this.add.graphics().setDepth(90);
      this.banner = G.ui.text(this, this.W / 2, 0, '', 15, '#ffd23f', { strokeThickness: 7, lineSpacing: 10 }).setDepth(95).setAlpha(0);
      this.placeHud(); this.updateHud();
    }
    placeHud() {
      const y = G.safe.top + 24;
      this.lbl.setPosition(this.W / 2, y);
      this.lblSub.setPosition(this.W / 2, y + 24);
      this.barY = y + 40;
      this.banner.setPosition(this.W / 2, G.safe.top + Math.max(120, this.H * 0.2));
      this.updateHud();
    }
    updateHud() {
      const n = this.stack.length - 1;
      this.lbl.setText(`Capas: ${n}/${CFG.TARGET}`);
      const next = this.moving ? NAME[this.moving.kind] : '';
      if (!this.over) this.lblSub.setText(next ? `Ahora: ${next}` : '');
      const bw = 180, x0 = this.W / 2 - bw / 2;
      this.bar.clear().fillStyle(0x1b1430, 0.85).fillRect(x0 - 2, this.barY - 2, bw + 4, 10)
        .fillStyle(0xffd23f, 1).fillRect(x0, this.barY, bw * Math.min(1, n / CFG.TARGET), 6);
    }
    showBanner(txt, ms = 900, color = '#ffd23f') {
      this.tweens.killTweensOf(this.banner);
      this.banner.setText(txt).setColor(color).setAlpha(1).setScale(0.6);
      this.tweens.add({ targets: this.banner, scale: 1, duration: 200, ease: 'Back.out' });
      this.tweens.add({ targets: this.banner, alpha: 0, delay: ms, duration: 300 });
    }

    top() { return this.stack[this.stack.length - 1]; }
    newLayer() {
      const t = this.top(), n = this.stack.length - 1;
      const kind = CFG.ORDER[n % 3];
      const fromLeft = n % 2 === 0;
      const y = t.y - LH;
      const s = this.add.tileSprite(fromLeft ? -t.w * 0.35 : this.W - t.w * 0.65, y - LH * 1.5, t.w, LH, KEY[kind]).setOrigin(0, 0);
      this.layers.add(s);
      this.moving = { s, kind, w: t.w, y };
      this.dir = fromLeft ? 1 : -1;
      this.speed = Math.min(CFG.SPEED_MAX, CFG.SPEED0 + n * CFG.SPEED_STEP);
      this.state = 'slide';
      this.updateHud();
    }

    drop() {
      if (this.over || this.state !== 'slide' || !this.moving) return;
      const now = this.time.now; if (now - this.lastTap < 160) return; this.lastTap = now;
      this.state = 'dropping';
      const m = this.moving;
      G.sfx.drop();
      this.tweens.add({ targets: m.s, y: m.y, duration: 80, ease: 'Quad.in', onComplete: () => this.resolve() });
    }

    resolve() {
      const m = this.moving, t = this.top(), s = m.s;
      let x = s.x, w = m.w;
      const off = x - t.x;
      let perfect = false;
      if (Math.abs(off) <= CFG.PERFECT_PX) { x = t.x; s.x = x; perfect = true; }
      const l = Math.max(x, t.x), r = Math.min(x + w, t.x + t.w);
      if (r - l <= CFG.MIN_OVERLAP) return this.miss();
      // cortar lo que sobresale
      if (!perfect) {
        if (x < l) this.chunk(x, l - x, m, -1);
        if (x + w > r) this.chunk(r, x + w - r, m, 1);
        s.x = l; s.width = r - l; w = r - l; x = l;
        this.streak = 0;
        G.sfx.beep(330 + this.stack.length * 20, 0.06, 0.08);
      } else {
        this.perfects++; this.streak++;
        G.sfx.catch();
        let msg = '¡Perfecto!';
        if (this.streak >= CFG.REGROW_AFTER && w < CFG.START_W) {
          const g = Math.min(CFG.REGROW_PX, CFG.START_W - w);
          x -= g / 2; w += g; s.x = x; s.width = w; msg = '¡Perfecto!\n¡Más lasagna!';
          this.streak = 0;
        }
        this.showBanner(msg, 600);
        const fl = this.add.rectangle(x + w / 2, m.y + LH / 2, w + 6, LH + 6, 0xffffff, 0.7);
        this.world.add(fl);
        this.tweens.add({ targets: fl, alpha: 0, scaleX: 1.15, duration: 300, onComplete: () => fl.destroy() });
      }
      // miguitas al caer
      for (let i = 0; i < 4; i++) {
        const c = this.add.image(Phaser.Math.Between(x, x + w), m.y + LH - 2, 'ls-crumb')
          .setTint(m.kind === 'ragu' ? 0xb8321e : m.kind === 'bech' ? 0xf6eed6 : 0xf3cf6a);
        this.world.add(c);
        this.tweens.add({ targets: c, y: c.y - Phaser.Math.Between(6, 14), x: c.x + Phaser.Math.Between(-10, 10), alpha: 0, duration: 380, onComplete: () => c.destroy() });
      }
      this.stack.push({ x, w, y: m.y, s, kind: m.kind });
      this.moving = null;
      this.cameraFollow();
      if (this.stack.length - 1 >= CFG.TARGET) return this.win();
      this.time.delayedCall(90, () => { if (!this.over) this.newLayer(); });
      this.updateHud();
    }

    chunk(x, w, m, side) {
      const c = this.add.tileSprite(x, m.y, w, LH, KEY[m.kind]).setOrigin(0, 0);
      this.world.add(c);
      this.tweens.add({ targets: c, y: c.y + this.H, x: c.x + side * 60, angle: side * 160, duration: 1100, ease: 'Quad.in', onComplete: () => c.destroy() });
    }

    cameraFollow() {
      // mantener la capa de arriba por debajo del 40 % de la pantalla
      const topScreen = this.top().y + this.world.y;
      const want = G.safe.top + Math.max(170, this.H * 0.4);
      if (topScreen < want) this.tweens.add({ targets: this.world, y: this.world.y + (want - topScreen), duration: 250, ease: 'Sine.out' });
    }

    miss() {
      this.over = true;
      const s = this.moving.s;
      this.moving = null;
      // la capa que cae pasa por delante de la fuente
      this.layers.remove(s); this.world.add(s);
      this.tweens.add({ targets: s, y: s.y + this.H, angle: this.dir * 120, duration: 1000, ease: 'Quad.in' });
      this.cameras.main.shake(200, 0.01);
      G.sfx.gameOver();
      this.showBanner('¡Se ha caído!', 1400, '#ff7a7a');
      const data = { win: false, layers: this.stack.length - 1, perfects: this.perfects };
      this.time.delayedCall(1700, () => this.scene.start('LasagnaEnd', data));
    }

    win() {
      this.over = true; this.state = 'oven';
      const layers = this.stack.length - 1;
      // Récord: cada capa cuenta y las perfectas suman extra
      G.progress.recordScore(CFG.id, layers * 100 + this.perfects * 50);
      G.progress.complete(CFG.id);
      this.updateHud();
      // El marcador se retira y los avisos suben arriba: así no tapan el gratinado de la cima
      this.tweens.add({ targets: [this.lbl, this.lblSub, this.bar], alpha: 0, duration: 250 });
      this.banner.setY(G.safe.top + 48);
      // Gratinado: brillo de horno, la bechamel se dora, el queso de arriba se funde y sale vapor
      const glow = this.add.rectangle(0, 0, this.W, this.H, 0xff7a1a, 0).setOrigin(0).setScrollFactor(0).setDepth(20).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: glow, fillAlpha: 0.32, duration: 500, yoyo: true, hold: 900 });
      this.showBanner('¡Al horno!\nGratinando...', 1300);
      G.sfx.turbo();
      this.showWholeTower();
      const tops = this.stack.slice(1).filter(l => l.kind === 'bech');
      tops.reverse().forEach((l, i) => this.time.delayedCall(500 + i * 90, () => l.s.setTexture('ls-gratin')));
      const t = this.top();
      const crust = this.add.tileSprite(t.x, t.y - 5, t.w, 14, 'ls-crust').setOrigin(0).setAlpha(0);
      this.world.add(crust);
      this.tweens.add({ targets: crust, alpha: 1, delay: 700, duration: 700 });
      [[0.25, false], [0.62, true], [0.8, false]].forEach(([fx, flip], i) => {
        const b = this.add.image(t.x + t.w * fx, t.y - 5, 'ls-basil').setFlipX(flip).setScale(0).setAngle(i * 25 - 20);
        this.world.add(b);
        this.tweens.add({ targets: b, scale: 2, delay: 1500 + i * 150, duration: 260, ease: 'Back.out' });
      });
      this.time.addEvent({ delay: 90, repeat: 22, callback: () => {
        const p = this.add.image(Phaser.Math.Between(t.x, t.x + t.w), t.y - 4, 'ls-steam').setAlpha(0.7);
        this.world.add(p);
        this.tweens.add({ targets: p, y: p.y - 60, alpha: 0, scale: 2.2, duration: 1000, onComplete: () => p.destroy() });
      } });
      this.time.delayedCall(2000, () => { G.sfx.win(); this.showBanner('¡Lasagna\nperfecta!', 1200); });
      const data = { win: true, layers, perfects: this.perfects, secs: Math.round(this.elapsed) };
      this.time.delayedCall(3400, () => this.scene.start('LasagnaEnd', data));
    }

    /** Al ganar, la cámara se aleja para ver la torre entera de la fuente a la última capa. */
    showWholeTower() {
      const topY = this.top().y - 30, botY = this.baseY + this.dish.height;
      const y0 = G.safe.top + 100, y1 = this.H - G.safe.bottom - 10;
      const k = Math.min(1, (y1 - y0) / (botY - topY));
      this.tweens.add({ targets: this.world, scale: k, x: (this.W / 2) * (1 - k), y: y1 - botY * k, duration: 900, ease: 'Sine.inOut' });
    }

    /** Contornos laterales de las capas (puestas y la que se mueve). */
    drawEdges() {
      const g = this.edges.clear();
      for (let i = 1; i < this.stack.length; i++) { const l = this.stack[i]; MG.drawEdges(g, l.x, l.y, l.w); }
      const m = this.moving;
      if (m) MG.drawEdges(g, m.s.x, m.s.y, m.w);
    }

    update(time, dtMs) {
      this.drawEdges();
      if (this.over) return;
      this.elapsed += dtMs / 1000;
      const m = this.moving;
      if (!m || this.state !== 'slide') return;
      const dt = Math.min(dtMs, 50) / 1000;
      m.s.x += this.dir * this.speed * dt;
      const minX = -m.w * 0.35, maxX = this.W - m.w * 0.65;
      if (m.s.x > maxX) { m.s.x = maxX; this.dir = -1; }
      if (m.s.x < minX) { m.s.x = minX; this.dir = 1; }
    }
  }
  MG.scenes.push(LasagnaGame);
})(window.AneGame);
