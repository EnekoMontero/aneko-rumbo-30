/* Partida: Ane se mueve abajo con el plato y caen pintxos y pimientos picantes. */
(function (G) {
  const MG = G.minigames.pintxos, CFG = MG.config;
  const lerp = (a, b, t) => a + (b - a) * t;

  class PintxosGame extends Phaser.Scene {
    constructor() { super('PintxosGame'); }

    create() {
      const { width: W, height: H } = this.scale;
      this.W = W; this.H = H;
      this.groundY = H - 14 - G.safe.bottom;   // línea del suelo (pies de Ane), sobre la barra de inicio
      this.score = 0;
      this.lives = CFG.LIVES;
      this.elapsed = 0;
      this.spawnTimer = 600;
      this.lastX = W / 2;
      this.over = false;
      this.reactUntil = 0;            // fin de la animación de comer/picante
      this.items = [];
      this.pxQueue = [];              // pintxos en el aire: {x, t = ms en que llegan al plato}

      this.bg = G.ui.background(this, 'bg-zamora', 0.08);

      // Ane (origen en los pies)
      this.ane = this.add.image(W / 2, this.groundY, 'ane-idle').setOrigin(0.5, 1).setDepth(5).setScale(CFG.ANE_SCALE);
      this.AH0 = this.ane.height * CFG.ANE_SCALE;   // altura de Ane en pantalla (para calcular cuándo llega cada cosa)
      this.aneDir = 1;

      this.buildHud();

      // Teclado
      this.keys = this.input.keyboard.addKeys('LEFT,RIGHT,A,D');
    }

    // ---------- HUD ----------
    buildHud() {
      // Arriba a la izquierda (los botones HTML van arriba a la derecha)
      const y = G.safe.top + 20;
      this.hearts = [];
      for (let i = 0; i < CFG.LIVES; i++) {
        this.hearts.push(this.add.image(18 + i * 26, y, 'heart').setScale(2).setDepth(20));
      }
      this.scoreIcon = this.add.image(20, y + 30, 'px-figon').setScale(0.5).setDepth(20);
      this.scoreText = G.ui.text(this, 36, y + 31, `0/${CFG.TARGET_PINTXOS}`, 14, '#ffd23f', { ox: 0 }).setDepth(20);
    }

    /** El alto lógico cambió (barra del navegador, otro tamaño): recolocar sin reiniciar. */
    relayout() {
      const { width: W, height: H } = this.scale;
      const oldGround = this.groundY;
      this.W = W; this.H = H;
      this.groundY = H - 14 - G.safe.bottom;
      this.ane.y += this.groundY - oldGround;
      const y = G.safe.top + 20;
      this.hearts.forEach(h => (h.y = y));
      this.scoreIcon.y = y + 30; this.scoreText.y = y + 31;
      this.bg.fit();
    }
    updateHud() {
      this.scoreText.setText(`${this.score}/${CFG.TARGET_PINTXOS}`);
      this.hearts.forEach((h, i) => h.setTexture(i < this.lives ? 'heart' : 'heart-empty'));
    }

    // ---------- Entrada ----------
    /** Devuelve -1..1: toque (mitades), teclado o inclinación. */
    readInput() {
      let dir = 0;
      // Multitáctil: cada dedo empuja hacia su mitad
      this.input.manager.pointers.forEach(p => {
        if (p.isDown) dir += p.x < this.W / 2 ? -1 : 1;
      });
      if (this.keys.LEFT.isDown || this.keys.A.isDown) dir -= 1;
      if (this.keys.RIGHT.isDown || this.keys.D.isDown) dir += 1;
      dir = Phaser.Math.Clamp(dir, -1, 1);
      if (dir === 0 && G.tilt.enabled) {
        const t = G.tilt.value, dead = 3, full = 20;
        if (Math.abs(t) > dead) dir = Phaser.Math.Clamp((Math.abs(t) - dead) / (full - dead), 0, 1) * Math.sign(t);
      }
      return dir;
    }

    // ---------- Bucle ----------
    update(time, delta) {
      if (this.over) return;
      const dt = Math.min(delta, 50) / 1000;
      this.elapsed += delta;
      const d = Math.min(1, this.elapsed / CFG.RAMP_MS);   // dificultad 0..1

      // Movimiento
      const dir = this.readInput();
      const halfW = Math.round(24 * CFG.ANE_SCALE);
      this.ane.x = Phaser.Math.Clamp(this.ane.x + dir * CFG.ANE_SPEED * dt, halfW, this.W - halfW);
      if (dir !== 0) this.aneDir = Math.sign(dir);
      if (time > this.reactUntil) {
        const moving = Math.abs(dir) > 0.15;
        this.ane.setTexture(moving ? 'ane-run' : 'ane-idle');
        this.ane.setFlipX(moving && this.aneDir < 0);
        // pequeño bote al correr
        this.ane.y = this.groundY - (moving ? Math.abs(Math.sin(time / 70)) * 3 : 0);
      }

      // Aparición
      this.spawnTimer -= delta;
      if (this.spawnTimer <= 0) {
        this.spawn(d);
        this.spawnTimer = lerp(CFG.SPAWN_MS[0], CFG.SPAWN_MS[1], d) * Phaser.Math.FloatBetween(0.85, 1.15);
      }

      // Caída y colisiones
      const AH = this.ane.height * CFG.ANE_SCALE;   // altura en pantalla de Ane (constante aunque cambie la pose)
      const plateTop = this.groundY - AH * 0.8, plateBottom = this.groundY - AH * 0.36;
      for (const it of this.items) {
        if (it.done) continue;
        it.y += it.vy * dt;
        it.angle += it.spin * dt;
        const dx = Math.abs(it.x - this.ane.x);
        const reach = 24 * CFG.ANE_SCALE + it.displayWidth * 0.3;
        const top = it.isPepper ? this.groundY - AH * 1.02 : plateTop;   // el pimiento también te da en la cara
        if (dx < reach && it.y + it.displayHeight * 0.35 >= top && it.y <= plateBottom) {
          it.isPepper ? this.hitPepper(it, time) : this.catchPintxo(it, time);
        } else if (it.y - it.displayHeight / 2 > this.groundY - 6) {
          this.dropped(it);
        }
      }
      this.items = this.items.filter(it => !it.done);
    }

    /**
     * Aparición justa. Se calcula cuándo llegará cada cosa a la altura del plato:
     * - Los pintxos llegan en orden y con un margen mínimo (MIN_GAP_S), y cada uno está a una
     *   distancia que Ane puede recorrer a tiempo desde el anterior.
     * - Un pimiento nunca cae donde hay que coger un pintxo ni en el camino entre dos pintxos
     *   que llegan justo antes y después; si no hay sitio libre, ese pimiento no sale.
     */
    spawn(d) {
      const isPepper = Math.random() < lerp(CFG.PEPPER_CHANCE[0], CFG.PEPPER_CHANCE[1], d);
      const def = isPepper ? null : Phaser.Utils.Array.GetRandom(CFG.PINTXOS);
      const key = 'px-' + (isPepper ? CFG.PEPPER_KEY : def.key);
      let vy = lerp(CFG.FALL_SPEED[0], CFG.FALL_SPEED[1], d) * this.H * Phaser.Math.FloatBetween(0.9, 1.12);
      const fallPx = this.plateY() + 30;                         // desde y = -30 hasta el plato
      let arrive = this.elapsed + (fallPx / vy) * 1000;          // ms (reloj de la partida)
      this.pxQueue = this.pxQueue.filter(q => q.t > this.elapsed - 400);
      const lo = 26, hi = this.W - 26;
      let x;
      if (!isPepper) {
        const last = this.pxQueue[this.pxQueue.length - 1];
        if (last) {
          // llega como pronto MIN_GAP_S después del anterior (si hace falta, cae un poco más despacio)
          const minT = last.t + CFG.MIN_GAP_S * 1000;
          if (arrive < minT) { arrive = minT; vy = fallPx / ((arrive - this.elapsed) / 1000); }
          const reach = CFG.ANE_SPEED * 0.8 * (arrive - last.t) / 1000 + 36;   // lo que da tiempo a moverse
          const r = Math.min(CFG.MAX_JUMP_X, reach);
          x = Phaser.Math.Between(Math.max(lo, last.x - r), Math.min(hi, last.x + r));
        } else x = Phaser.Math.Between(lo + 40, hi - 40);
        this.pxQueue.push({ x, t: arrive });
      } else {
        for (let k = 0; k < 10 && x === undefined; k++) {
          const cx = Phaser.Math.Between(lo, hi);
          if (this.pepperFair(cx, arrive)) x = cx;
        }
        if (x === undefined) return;                             // no hay hueco justo: este no sale
      }
      const it = this.add.image(x, -30, key).setDepth(4);
      it.isPepper = isPepper; it.def = def;
      it.vy = vy;
      it.spin = isPepper ? Phaser.Math.Between(-90, 90) : Phaser.Math.Between(-40, 40);
      this.items.push(it);
    }
    /** Altura (y) a la que se recoge: parte media del plato. */
    plateY() { return this.groundY - this.AH0 * 0.6; }
    /** ¿Es justo un pimiento en x que llega en el instante t (ms)? */
    pepperFair(x, t) {
      const M = CFG.PEPPER_MARGIN, win = CFG.PEPPER_WINDOW_S * 1000, q = this.pxQueue;
      for (let i = 0; i < q.length; i++) {
        if (Math.abs(q[i].t - t) < win && Math.abs(q[i].x - x) < M) return false;   // encima de un pintxo
        const a = q[i], b = q[i + 1];
        if (b && a.t <= t && t <= b.t) {                        // en el camino de a hacia b
          const k = (t - a.t) / Math.max(1, b.t - a.t), px = a.x + (b.x - a.x) * k;
          if (Math.abs(px - x) < M) return false;
        }
      }
      return true;
    }

    // ---------- Eventos ----------
    catchPintxo(it, time) {
      it.done = true;
      this.score++;
      G.sfx.catch();
      this.updateHud();
      this.tweens.add({ targets: this.scoreText, scale: 1.3, duration: 90, yoyo: true });
      this.ane.setTexture('ane-eat').setFlipX(false);
      this.ane.y = this.groundY;
      this.reactUntil = time + 380;
      // el pintxo cae al plato y desaparece "a la boca"
      this.tweens.add({
        targets: it, x: this.ane.x + 2, y: this.groundY - this.ane.displayHeight * 0.78, scale: 0.3, angle: 0, alpha: 0.2,
        duration: 260, ease: 'Quad.in', onComplete: () => it.destroy(),
      });
      this.floatText(this.ane.x, this.groundY - 130 * CFG.ANE_SCALE, `+1 ${it.def.name}`, '#ffd23f');
      this.sparkles(this.ane.x, this.groundY - 92 * CFG.ANE_SCALE, 0xffe066);
      if (this.score >= CFG.TARGET_PINTXOS) this.finish(true);
    }

    hitPepper(it, time) {
      it.done = true;
      G.sfx.pepper();
      it.destroy();
      this.ane.setTexture('ane-spicy').setFlipX(false);
      this.ane.y = this.groundY;
      this.reactUntil = time + 900;
      this.cameras.main.shake(260, 0.012);
      this.cameras.main.flash(180, 255, 40, 40);
      this.floatText(this.ane.x, this.groundY - 136 * CFG.ANE_SCALE, '¡PICA!', '#ff4040');
      this.sparkles(this.ane.x, this.groundY - 104 * CFG.ANE_SCALE, 0xff5030);
      this.loseLife();
    }

    dropped(it) {
      it.done = true;
      if (it.isPepper) {
        this.tweens.add({ targets: it, alpha: 0, duration: 250, onComplete: () => it.destroy() });
        return;
      }
      G.sfx.drop();
      it.y = this.groundY - 8; it.angle = 0;
      this.tweens.add({ targets: it, scaleY: 0.4, scaleX: 1.3, alpha: 0, duration: 500, ease: 'Quad.out', onComplete: () => it.destroy() });
      this.floatText(it.x, this.groundY - 40, '¡Se cayó!', '#ffffff');
      this.loseLife();
    }

    loseLife() {
      if (this.over) return;
      this.lives--;
      const h = this.hearts[this.lives];
      if (h) this.tweens.add({ targets: h, scale: 3.2, duration: 120, yoyo: true });
      this.updateHud();
      setTimeout(() => G.sfx.lifeLost(), 150);
      if (this.lives <= 0) this.finish(false);
    }

    finish(win) {
      if (this.over) return;
      this.over = true;
      const score = this.score;
      G.progress.recordScore(CFG.id, score);
      if (win) G.progress.complete(CFG.id);   // desbloquea el siguiente nodo + premio (placeholder)
      this.items.forEach(it => !it.done && this.tweens.add({ targets: it, alpha: 0, duration: 300 }));
      this.time.delayedCall(win ? 400 : 900, () => this.scene.start('PintxosEnd', { win, score }));
    }

    // ---------- Efectos ----------
    floatText(x, y, str, color) {
      const t = G.ui.text(this, x, y, str, 9, color).setDepth(30);
      t.x = Phaser.Math.Clamp(x, t.width / 2 + 6, this.W - t.width / 2 - 6);
      this.tweens.add({ targets: t, y: y - 26, alpha: 0, duration: 800, ease: 'Quad.out', onComplete: () => t.destroy() });
    }
    sparkles(x, y, color) {
      for (let i = 0; i < 7; i++) {
        const s = this.add.rectangle(x, y, 3, 3, color).setDepth(30);
        const a = (Math.PI * 2 * i) / 7;
        this.tweens.add({ targets: s, x: x + Math.cos(a) * 26, y: y + Math.sin(a) * 20, alpha: 0, duration: 420, onComplete: () => s.destroy() });
      }
    }
  }
  MG.scenes.push(PintxosGame);
})(window.AneGame);
