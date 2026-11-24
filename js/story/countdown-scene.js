/*
 * Cuenta atrás ANTES del día 1 (antes del 3 de diciembre). Si Ane abre el enlace antes de tiempo no ve
 * la intro ni el mapa: ve el MAPA EN PENUMBRA, recorrido despacio de abajo arriba, con los 7 destinos
 * como siluetas con "?" y el ¡30! brillando arriba, y cuánto falta (días, horas, minutos y segundos).
 * Al llegar a cero empieza la intro (suena el despertador) — o el mapa si ya la vio.
 * Se prueba con FORCE_TEST = true y ?hoy=2026-12-01 en la dirección. Textos en js/core/texts.js (countdown).
 * La geometría del mapa (STEP, XS, posición de iconos) es la misma que en js/map/map-scene.js.
 */
(function (G) {
  const STEP = 190, XS = [128, 232];

  class CountdownScene extends Phaser.Scene {
    constructor() { super('Countdown'); }

    create() {
      const { width: W, height: H } = this.scale;
      this.W = W; this.H = H; this.leaving = false;
      const T = G.T.countdown, top = G.safe.top, bottom = H - G.safe.bottom;
      G.showTiltButton && G.showTiltButton(false);

      // ---- Mapa (misma colocación que la escena del mapa) ----
      const nodes = G.MAP.nodes, N = nodes.length, panelH = 112 + G.safe.bottom;
      const worldH = Math.max(H, 210 + (N - 1) * STEP + 240) + panelH - 112;
      const baseY = worldH - panelH - 96;
      const pts = nodes.map((n, i) => ({ x: n.final ? W / 2 : XS[i % 2], y: baseY - i * STEP }));
      const bg = G.MAP_BG, dy = pts[0].y - bg.base;
      const col = c => Phaser.Display.Color.GetColor(c[0], c[1], c[2]);
      this.add.rectangle(0, 0, W, worldH, col(bg.top)).setOrigin(0);
      this.add.image(0, dy, 'map-bg').setOrigin(0);

      // Destinos: siluetas oscuras con "?"; el ¡30! a todo color, con halo y destellos
      nodes.forEach((n, i) => {
        const p = pts[i];
        const ip = n.final ? { x: p.x, y: p.y - 70 } : { x: p.x < W / 2 ? p.x - 60 : p.x + 60, y: p.y - 26 };
        if (n.final) {
          const halo = this.add.circle(ip.x, ip.y, 58, 0xffd23f, 0.22).setDepth(4);
          this.tweens.add({ targets: halo, scale: 1.3, alpha: 0.06, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
          const ic = this.add.image(ip.x, ip.y, n.icon).setDepth(5);
          this.tweens.add({ targets: ic, y: ip.y - 6, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
          this.time.addEvent({ delay: 420, loop: true, callback: () => {
            const sp = this.add.star(ip.x + Phaser.Math.Between(-46, 46), ip.y + Phaser.Math.Between(-56, 40), 4, 2, 6, 0xfff2a8).setDepth(6);
            this.tweens.add({ targets: sp, scale: 1.8, alpha: 0, angle: 90, duration: 700, onComplete: () => sp.destroy() });
          } });
          this.finalY = ip.y;
        } else {
          this.add.image(ip.x, ip.y, n.icon).setDepth(3).setTint(0x000000).setAlpha(0.55);
          const q = G.ui.text(this, ip.x, ip.y, '?', 16, '#9fb4d8', { strokeThickness: 5 }).setDepth(4).setAlpha(0.8);
          this.tweens.add({ targets: q, alpha: 0.35, duration: 900 + i * 120, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        }
      });

      // ---- Penumbra (fija en pantalla) ----
      this.add.rectangle(0, 0, W, H, 0x05060f, 0.84).setOrigin(0).setScrollFactor(0).setDepth(2);
      // el ¡30! por encima de la penumbra para que brille
      // (los iconos con depth >= 4 quedan sobre la capa oscura de depth 2; las siluetas, debajo)

      // ---- Disposición de los textos fijos (se calcula antes para encuadrar el ¡30!) ----
      const ty = top + Math.max(70, H * 0.1);
      const py = ty + 96, pw = W - 32, ph = 118;
      const freeMid = (py + ph + bottom - 90) / 2;   // centro del hueco libre entre el panel y el texto de abajo

      // Cámara: recorre el mapa despacio de abajo (día 1) a arriba, hasta dejar el ¡30! en el hueco libre, y vuelve.
      // Por encima del mapa se rellena con el color del mar para poder subir más allá del borde.
      this.add.rectangle(0, -H, W, H, col(bg.top)).setOrigin(0);
      const cam = this.cameras.main;
      cam.setBounds(0, -H, W, worldH + H);
      const yBottom = worldH - H, yTop = this.finalY - freeMid;
      cam.scrollY = yBottom;
      this.tweens.add({ targets: cam, scrollY: yTop, duration: 16000, ease: 'Sine.inOut', yoyo: true, hold: 3000, repeatDelay: 1500, repeat: -1 });

      // ---- Textos y cuenta atrás (fijos) ----
      const fix = o => o.setScrollFactor(0).setDepth(20);
      fix(G.ui.text(this, W / 2, ty, T.title, 18, '#ffd23f', { strokeThickness: 7, lineSpacing: 12, wrap: 340 }));
      fix(this.add.graphics().fillStyle(0x1b1430, 0.92).fillRoundedRect(16, py, pw, ph, 10)
        .lineStyle(3, 0xffd23f, 1).strokeRoundedRect(16, py, pw, ph, 10));
      fix(G.ui.text(this, W / 2, py + 20, T.label, 9, '#ffffff', { strokeThickness: 3 }));
      this.cells = T.units.map((u, i) => {
        const cx = 16 + pw * (i + 0.5) / 4;
        const num = fix(G.ui.text(this, cx, py + 62, '00', 24, '#ffd23f', { strokeThickness: 6 }));
        fix(G.ui.text(this, cx, py + 96, u, 8, '#9fd3ff', { strokeThickness: 3 }));
        if (i < 3) fix(G.ui.text(this, 16 + pw * (i + 1) / 4, py + 60, ':', 18, '#ffffff', { strokeThickness: 5 }));
        return num;
      });
      const sub = fix(G.ui.text(this, W / 2, bottom - 56, T.sub, 10, '#ffffff', { strokeThickness: 4, lineSpacing: 8, wrap: 330 }));
      fix(this.add.rectangle(W / 2, sub.y, W - 32, sub.height + 22, 0x1b1430, 0.85).setStrokeStyle(2, 0xffd23f, 0.8)).setDepth(19);

      this.tick();
      this.time.addEvent({ delay: 250, loop: true, callback: () => this.tick() });
    }

    /** Actualiza las cifras; al llegar a cero, empieza la aventura. */
    tick() {
      if (this.leaving) return;
      const left = Math.max(0, G.unlock.startMs() - G.unlock.nowMs());
      const sec = Math.floor(left / 1000);
      const parts = [Math.floor(sec / 86400), Math.floor(sec / 3600) % 24, Math.floor(sec / 60) % 60, sec % 60];
      parts.forEach((v, i) => this.cells[i].setText(String(v).padStart(2, '0')));
      if (left <= 0) this.begin();
    }
    begin() {
      this.leaving = true;
      G.sfx.unlock();
      const t = G.ui.text(this, this.W / 2, this.H * 0.55, G.T.countdown.ready, 18, '#ffd23f', { strokeThickness: 7 })
        .setScrollFactor(0).setDepth(30).setScale(0.3);
      this.tweens.add({ targets: t, scale: 1, duration: 400, ease: 'Back.out' });
      this.time.delayedCall(1600, () => {
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(G.story.shouldShowIntro() ? 'Intro' : 'Map'));
      });
    }

    relayout() { this.scene.restart(); }
  }
  G.coreScenes.push(CountdownScene);
})(window.AneGame);
