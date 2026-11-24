/* Partida de "Nadar en Bali": arrastrar para nadar, recoger tortugas, esquivar dragones y medusas. */
(function (G) {
  const MG = G.minigames.bali, CFG = MG.config;
  const R = (a) => Phaser.Math.Between(a[0], a[1]);

  class BaliGame extends Phaser.Scene {
    constructor() { super('BaliGame'); }

    create() {
      MG.makeTextures(this);
      G.showTiltButton(false);
      Object.assign(this, {
        turtles: 0, lives: CFG.LIVES, elapsed: 0, over: false, invulnUntil: 0,
        tAcc: 1200, kAcc: -1500, jAcc: 0, bubAcc: 0, frameAcc: 0, frame: 0,
        swimmers: [], komodos: [], jellies: [], followers: [], shadows: [],
        drag: null, keyV: { x: 0, y: 0 },
      });
      const W = this.W = this.scale.width;
      this.H = this.scale.height;
      // Mar con playas, fondo marino, cáusticas, peces de decorado y espuma (profundidades 0–4)
      this.sea = MG.makeSea(this);

      this.computeBounds();
      this.ane = this.add.image(W / 2, this.maxY - 40, 'bl-ane_swim1').setScale(0.9).setDepth(10);
      this.addShadow(this.ane, 1.2);
      this.target = { x: this.ane.x, y: this.ane.y };

      this.buildHud();

      // Arrastrar: Ane se mueve lo mismo que el dedo (relativo), solo cuenta el primer dedo
      this.input.on('pointerdown', p => {
        if (this.drag || this.over) return;
        this.drag = { id: p.id, px: p.x, py: p.y, ax: this.target.x, ay: this.target.y };
      });
      this.input.on('pointermove', p => {
        const d = this.drag; if (!d || p.id !== d.id || !p.isDown) return;
        this.target.x = d.ax + (p.x - d.px) * 1.15; this.target.y = d.ay + (p.y - d.py) * 1.15;
        this.clampTarget();
      });
      const up = p => { if (this.drag && p.id === this.drag.id) this.drag = null; };
      this.input.on('pointerup', up); this.input.on('pointerupoutside', up);
      this.cursors = this.input.keyboard.addKeys('UP,DOWN,LEFT,RIGHT,W,A,S,D');

      this.showBanner(`¡Junta ${CFG.TURTLES} tortugas!`, 1600);
    }

    computeBounds() {
      const B = CFG.BEACH;
      this.minX = B + 26; this.maxX = this.W - B - 26;
      this.minY = G.safe.top + 70; this.maxY = this.H - G.safe.bottom - 44;
    }
    clampTarget() {
      this.target.x = Phaser.Math.Clamp(this.target.x, this.minX, this.maxX);
      this.target.y = Phaser.Math.Clamp(this.target.y, this.minY, this.maxY);
    }
    relayout() {
      this.H = this.scale.height;
      this.sea.resize();
      this.computeBounds(); this.clampTarget();
      this.ane.y = Phaser.Math.Clamp(this.ane.y, this.minY, this.maxY);
      this.placeHud();
    }

    buildHud() {
      this.hearts = [];
      for (let i = 0; i < CFG.LIVES; i++) this.hearts.push(this.add.image(0, 0, 'heart').setScale(2).setDepth(90));
      this.hudTurtle = this.add.image(0, 0, 'bl-turtle1').setScale(0.42).setDepth(90);
      this.lblT = G.ui.text(this, 0, 0, '', 11, '#ffd23f', { ox: 0 }).setDepth(90);
      this.banner = G.ui.text(this, this.W / 2, 0, '', 15, '#ffd23f', { strokeThickness: 7, lineSpacing: 10 }).setDepth(95).setAlpha(0);
      this.placeHud(); this.updateHud();
    }
    placeHud() {
      const y = G.safe.top + 20;
      this.hearts.forEach((h, i) => h.setPosition(18 + i * 26, y));
      this.hudTurtle.setPosition(CFG.BEACH + 30, y + 30);
      this.lblT.setPosition(CFG.BEACH + 46, y + 30);
      this.banner.setPosition(this.W / 2, this.H * 0.4);
    }
    updateHud() {
      this.hearts.forEach((h, i) => h.setTexture(i < this.lives ? 'heart' : 'heart-empty'));
      this.lblT.setText(`${this.turtles}/${CFG.TURTLES}`);
    }
    showBanner(txt, ms = 1200) {
      this.tweens.killTweensOf(this.banner);
      this.banner.setText(txt).setAlpha(1).setScale(0.6);
      this.tweens.add({ targets: this.banner, scale: 1, duration: 220, ease: 'Back.out' });
      this.tweens.add({ targets: this.banner, alpha: 0, delay: ms, duration: 300 });
    }
    floatText(x, y, txt, color) {
      const t = G.ui.text(this, x, y, txt, 11, color).setDepth(80);
      this.tweens.add({ targets: t, y: y - 36, alpha: 0, duration: 800, onComplete: () => t.destroy() });
    }

    /** Sombra sobre el fondo marino que sigue a un objeto jugable (lo despega del decorado). */
    addShadow(s, k = 1) {
      const sh = this.add.image(s.x, s.y, 'bl-shadow').setDepth(5).setScale(k);
      this.shadows.push({ s, sh, k });
    }
    updateShadows() {
      this.shadows = this.shadows.filter(o => {
        if (!o.s.active) { o.sh.destroy(); return false; }
        o.sh.setPosition(o.s.x + 6, o.s.y + 9).setAlpha(o.s.alpha).setVisible(o.s.visible);
        return true;
      });
    }

    /**
     * x aleatoria entre lo y hi lejos (>= minD) de las x de "avoid". Si no hay hueco,
     * la más alejada de varios intentos. Evita apariciones en camino de colisión.
     */
    pickX(lo, hi, avoid, minD) {
      let best = Phaser.Math.Between(lo, hi), bestD = -1;
      for (let i = 0; i < 12; i++) {
        const x = Phaser.Math.Between(lo, hi);
        const d = avoid.reduce((m, ax) => Math.min(m, Math.abs(x - ax)), 999);
        if (d >= minD) return x;
        if (d > bestD) { bestD = d; best = x; }
      }
      return best;
    }

    // ---- aparición de cosas ----
    spawnTurtle() {
      // Nada de tortugas en la misma columna que una medusa que aún no ha pasado: para cogerla
      // habría que comerse la medusa (la tortuga baja más rápido y la alcanzaría).
      const avoid = this.jellies.filter(j => j.s.y < this.H * 0.8).map(j => j.x0);
      const x = this.pickX(this.minX + 6, this.maxX - 6, avoid, 46);
      const s = this.add.image(x, -30, 'bl-turtle1').setScale(0.75).setDepth(8);
      this.addShadow(s, 1.1);
      this.swimmers.push({ s, x0: x, ph: Math.random() * 6, v: R(CFG.TURTLE_SPEED), state: 'free', t: 0 });
    }
    spawnKomodo() {
      const left = Math.random() < 0.5;
      const y = Phaser.Math.Clamp(this.ane.y + Phaser.Math.Between(-90, 50), this.minY + 10, this.maxY);
      const x = left ? CFG.BEACH / 2 - 4 : this.W - CFG.BEACH / 2 + 4;
      const s = this.add.image(x, y, 'bl-komodo1').setScale(0.7).setDepth(7).setAngle(left ? 90 : -90);
      this.addShadow(s, 1.4);
      const w = this.add.image(x + (left ? 14 : -14), y - 30, 'bl-warn').setDepth(85);
      this.tweens.add({ targets: w, scale: 1.25, duration: 160, yoyo: true, repeat: -1 });
      G.sfx.beep(left ? 420 : 460, 0.07, 0.08);
      this.komodos.push({ s, w, dir: left ? 1 : -1, state: 'warn', t: 0, v: R(CFG.KOMODO_SPEED), vy: 0, fa: 0 });
    }
    spawnJelly() {
      // Lejos de las tortugas libres que aún bajan (camino de colisión) y, si Ane nada arriba
      // del todo, tampoco justo encima de ella (no daría tiempo a reaccionar).
      const avoid = this.swimmers.filter(t => t.state === 'free' && t.s.y < this.H * 0.8).map(t => t.x0);
      if (this.ane.y < this.minY + 130) avoid.push(this.ane.x);
      const x = this.pickX(this.minX, this.maxX, avoid, 46);
      const s = this.add.image(x, -24, 'bl-jelly1').setDepth(8);
      this.addShadow(s, 0.9);
      this.jellies.push({ s, v: R(CFG.JELLY_SPEED), ph: Math.random() * 6, x0: x });
    }

    // ---- golpes y recogidas ----
    collect(tu) {
      tu.state = 'follow'; tu.t = 0;
      this.turtles++;
      G.sfx.catch();
      this.floatText(tu.s.x, tu.s.y - 20, '+1', '#ffd23f');
      this.followers.push(tu);
      if (this.followers.length > CFG.MAX_FOLLOWERS) this.release(this.followers[0]);
      this.updateHud();
      if (this.turtles === Math.ceil(CFG.TURTLES / 2)) this.showBanner('¡A mitad!', 900);
      if (this.turtles >= CFG.TURTLES) this.finish(true);
    }
    release(tu) {
      tu.state = 'leave';
      this.followers = this.followers.filter(f => f !== tu);
    }
    hurt(what) {
      if (this.over || this.time.now < this.invulnUntil) return;
      this.lives--; this.updateHud();
      this.invulnUntil = this.time.now + CFG.INVULN_MS;
      G.sfx.hit(); G.sfx.lifeLost();
      this.cameras.main.shake(180, 0.012);
      this.floatText(this.ane.x, this.ane.y - 34, what === 'jelly' ? '¡Medusa!' : '¡Ñam!', '#ff7a7a');
      this.tweens.add({ targets: this.ane, alpha: 0.25, duration: 110, yoyo: true, repeat: 5, onComplete: () => this.ane.setAlpha(1) });
      if (this.lives <= 0) this.finish(false);
    }
    finish(win) {
      if (this.over) return;
      this.over = true; this.drag = null;
      const data = { win, turtles: this.turtles, secs: Math.round(this.elapsed), lives: this.lives };
      if (win) {
        // Récord: cada vida vale mucho; dentro de las mismas vidas, cuanto más rápido, mejor
        G.progress.recordScore(CFG.id, this.lives * 1000 + Math.max(1, 999 - data.secs * 5));
        G.progress.complete(CFG.id);
        G.sfx.win();
        this.showBanner(`¡${CFG.TURTLES} tortugas!`, 1500);
        this.komodos.forEach(k => { if (k.w) { k.w.destroy(); k.w = null; } this.tweens.add({ targets: k.s, alpha: 0, duration: 400 }); });
        this.followers.forEach((f, i) => this.tweens.add({ targets: f.s, angle: 360, duration: 900, delay: i * 80 }));
      } else {
        G.sfx.gameOver();
        this.showBanner('¡Sin vidas!', 1400);
      }
      this.time.delayedCall(1700, () => this.scene.start('BaliEnd', data));
    }

    update(time, dtMs) {
      const dt = Math.min(dtMs, 50) / 1000;
      const scroll = CFG.SCROLL * dt;
      this.sea.update(Math.min(dtMs, 50), scroll);
      this.updateShadows();
      if (this.over) { this.followers.forEach((f, i) => this.follow(f, i, dt)); return; }
      this.elapsed += dt;

      // movimiento de Ane
      const k = this.cursors, sp = 260 * dt;
      const kx = (k.LEFT.isDown || k.A.isDown ? -1 : 0) + (k.RIGHT.isDown || k.D.isDown ? 1 : 0);
      const ky = (k.UP.isDown || k.W.isDown ? -1 : 0) + (k.DOWN.isDown || k.S.isDown ? 1 : 0);
      if (kx || ky) { this.target.x += kx * sp; this.target.y += ky * sp; this.clampTarget(); }
      const a = this.ane, dx = this.target.x - a.x, dy = this.target.y - a.y;
      const f = 1 - Math.pow(0.0005, dt);
      a.x += dx * f; a.y += dy * f;
      a.setAngle(Phaser.Math.Clamp(dx * 0.6, -18, 18));
      const moving = Math.hypot(dx, dy) > 3;
      this.frameAcc += dtMs;
      if (this.frameAcc > (moving ? 150 : 260)) {
        this.frameAcc = 0; this.frame = (this.frame + 1) % 4;
        a.setTexture('bl-ane_swim' + [1, 2, 3, 2][this.frame]);
      }
      this.bubAcc += dtMs;
      if (this.bubAcc > (moving ? 140 : 400)) {
        this.bubAcc = 0;
        const b = this.add.image(a.x + Phaser.Math.Between(-8, 8), a.y + 26, 'bl-bubble').setDepth(9).setAlpha(0.8);
        this.tweens.add({ targets: b, y: b.y + 30, alpha: 0, scale: 0.4, duration: 600, onComplete: () => b.destroy() });
      }

      // apariciones (las cadencias se aceleran un poco con el tiempo)
      const hard = Math.min(1, this.elapsed / 60);
      this.tAcc += dtMs;
      if (this.tAcc > R(CFG.TURTLE_EVERY)) { this.tAcc = 0; this.spawnTurtle(); }
      // Mientras Ane parpadea (invulnerable) no sale ningún dragón nuevo: así nunca se lanza uno
      // justo cuando se acaba el parpadeo sin el aviso "!" completo con Ane ya vulnerable.
      this.kAcc += dtMs;
      const kEvery = Phaser.Math.Linear(R(CFG.KOMODO_EVERY), CFG.KOMODO_MIN, hard);
      if (this.kAcc > kEvery && this.time.now >= this.invulnUntil) { this.kAcc = 0; this.spawnKomodo(); }
      if (this.elapsed > CFG.JELLY_FROM_S) {
        this.jAcc += dtMs;
        if (this.jAcc > R(CFG.JELLY_EVERY)) { this.jAcc = 0; this.spawnJelly(); }
      }

      // tortugas
      this.swimmers = this.swimmers.filter(tu => {
        tu.t += dtMs;
        const s = tu.s;
        if (tu.state === 'free') {
          s.y += tu.v * dt; s.x = tu.x0 + Math.sin(tu.ph + tu.t / 600) * 14;
          if (((tu.t / 300) | 0) % 2) s.setTexture('bl-turtle2'); else s.setTexture('bl-turtle1');
          if (Phaser.Math.Distance.Between(s.x, s.y, a.x, a.y) < 32) this.collect(tu);
          else if (s.y > this.H + 40) { s.destroy(); return false; }
        } else if (tu.state === 'follow') {
          this.follow(tu, this.followers.indexOf(tu), dt);
          if (tu.t > CFG.FOLLOW_MS) this.release(tu);
        } else {
          s.y -= 120 * dt; s.angle = Phaser.Math.Angle.RotateTo(s.rotation, 0, 0.1) * Phaser.Math.RAD_TO_DEG;
          s.alpha -= dt * 0.8;
          if (s.alpha <= 0 || s.y < -40) { s.destroy(); return false; }
        }
        return true;
      });
      if (this.over) return;   // la última tortuga acaba la partida en este mismo frame

      // dragones de Komodo
      const vuln = this.time.now >= this.invulnUntil;
      this.komodos = this.komodos.filter(kd => {
        kd.t += dtMs; kd.fa += dtMs;
        const s = kd.s;
        if (kd.state === 'warn') {
          s.y += scroll;
          if (kd.fa > 260) { kd.fa = 0; s.setTexture(s.texture.key === 'bl-komodo1' ? 'bl-komodo2' : 'bl-komodo1'); }
          kd.w.setPosition(s.x + kd.dir * 14, s.y - 30);
          if (kd.t > CFG.KOMODO_WARN_MS) {
            kd.state = 'dash'; kd.w.destroy(); kd.w = null;
            kd.vy = Phaser.Math.Clamp((a.y - s.y) * 0.35, -60, 60);
            s.setAngle(kd.dir > 0 ? 90 : -90);
            const sp = this.add.image(s.x + kd.dir * 20, s.y, 'bl-bubble').setScale(3).setDepth(9);
            this.tweens.add({ targets: sp, scale: 0.5, alpha: 0, duration: 300, onComplete: () => sp.destroy() });
          }
        } else {
          s.x += kd.dir * kd.v * dt; s.y += kd.vy * dt + scroll * 0.4;
          if (kd.fa > 120) { kd.fa = 0; s.setTexture(s.texture.key === 'bl-komodo1' ? 'bl-komodo2' : 'bl-komodo1'); }
          if (vuln) {
            const hx = s.x + kd.dir * 16;     // cabeza
            if (Phaser.Math.Distance.Between(hx, s.y, a.x, a.y) < 24 || Phaser.Math.Distance.Between(s.x - kd.dir * 6, s.y, a.x, a.y) < 20) this.hurt('komodo');
          }
          if (s.x < -50 || s.x > this.W + 50) { s.destroy(); return false; }
        }
        return true;
      });

      // medusas
      this.jellies = this.jellies.filter(j => {
        j.ph += dt * 3;
        j.s.y += j.v * dt * (0.6 + 0.4 * Math.sin(j.ph)); j.s.x = j.x0 + Math.sin(j.ph * 0.4) * 10;
        j.s.setScale(1 + Math.sin(j.ph) * 0.08, 1 - Math.sin(j.ph) * 0.08);
        j.s.setTexture(Math.sin(j.ph) > 0 ? 'bl-jelly1' : 'bl-jelly2');
        if (vuln && Phaser.Math.Distance.Between(j.s.x, j.s.y, a.x, a.y) < 20) this.hurt('jelly');
        if (j.s.y > this.H + 30) { j.s.destroy(); return false; }
        return true;
      });
    }
    follow(tu, i, dt) {
      if (i < 0) return;
      const off = [[-36, 18], [36, 18], [-24, 50], [24, 50]][i % 4];
      const s = tu.s, tx = this.ane.x + off[0], ty = this.ane.y + off[1];
      const f = 1 - Math.pow(0.02, dt);
      s.x += (tx - s.x) * f; s.y += (ty - s.y) * f;
      s.setAngle(Phaser.Math.Clamp((tx - s.x) * 2, -25, 25));
      if (((tu.t / 220) | 0) % 2) s.setTexture('bl-turtle2'); else s.setTexture('bl-turtle1');
    }
  }
  MG.scenes.push(BaliGame);
})(window.AneGame);
