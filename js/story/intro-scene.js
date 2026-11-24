/*
 * Intro (~15 s, se puede saltar): es de noche y Ane duerme; suena el despertador, entra la luz
 * de la mañana por la ventana, Ane salta de la cama y se estira; el calendario de la pared pasa
 * hojas hasta el 10 de diciembre ("Se acercan los 30...") y llega una carta con el Pasaporte
 * de los 30, que Ane celebra. Suena una melodía corta sintetizada (respeta el silencio).
 * Se ve la primera vez; luego, desde el pasaporte ("Ver intro").
 */
(function (G) {
  // Puntos del dibujo del dormitorio (en píxeles de assets/story/bedroom.png, 144x256)
  const BED = { clock: [134, 150], calendar: [118, 64], head: [90, 116], rug: [92, 236] };

  // Momentos de la intro (ms)
  const AT = { ring: 1700, music: 2500, wake: 3300, getUp: 4700, stretch: 5700, calendar: 6900, letter: 11300 };

  // Velocidad global de la intro: 1 = original; menos de 1 = más lenta (afecta a todo por igual,
  // animaciones, esperas y la melodía). 0.85 ≈ un 18 % más pausada.
  const SPEED = 0.85;

  // Melodía "buenos días" (nota MIDI, pulsos) y bajo (dos notas por compás de 4 pulsos)
  const BEAT = 0.34 / SPEED;
  const SONG = [
    [72, 1], [76, 1], [79, 1], [76, 1], [77, 1], [81, 1], [79, 2],
    [76, 1], [79, 1], [84, 1], [83, 1], [81, 1], [79, 0.5], [77, 0.5], [76, 2],
    [74, 1], [77, 1], [81, 1], [77, 1], [79, 1], [83, 1], [86, 2],
    [84, 1], [83, 0.5], [81, 0.5], [79, 1], [76, 1], [77, 0.5], [76, 0.5], [74, 1], [72, 2],
  ];
  const BASS = [[48, 55], [53, 48], [48, 55], [53, 48], [50, 57], [55, 50], [48, 52], [43, 48]];

  class IntroScene extends Phaser.Scene {
    constructor() { super('Intro'); }

    create() {
      const { width: W, height: H } = this.scale;
      this.W = W; this.H = H;
      this.done = false;   // la instancia se reutiliza: sin esto, "Ver la intro otra vez" se quedaba bloqueada
      this.time.timeScale = SPEED; this.tweens.timeScale = SPEED;   // toda la intro un pelín más pausada
      const T = G.T.intro;
      G.showTiltButton && G.showTiltButton(false);
      this.makeTextures();
      this.events.once('shutdown', () => this.stopMusic());

      // Dormitorio: llena la pantalla, pegado a la derecha (mesilla y calendario visibles)
      const s = Math.max(W / 144, H / 256), ox = W - 144 * s, oy = (H - 256 * s) / 2;
      this.bed = this.add.image(ox, oy, 'st-bedroom').setOrigin(0).setScale(s);
      this.bedEmpty = this.add.image(ox, oy, 'st-bedroom-empty').setOrigin(0).setScale(s).setAlpha(0).setDepth(0.5);
      this.at = ([x, y]) => ({ x: ox + x * s, y: oy + y * s });
      this.s = s;
      this.aneS = s * 78 / 112;              // Ane de pie mide ~78 px del dibujo de la habitación (en proporción con la cama: en la alfombra está más cerca que ella)

      const clockP = this.at(BED.clock), headP = this.at(BED.head);
      this.headP = headP;
      this.clock = this.add.image(Math.min(clockP.x, W - 22), clockP.y, 'st-clock').setOrigin(0.5, 1).setScale(Math.round(s)).setDepth(1);
      this.makeLight();
      this.dim = this.add.rectangle(0, 0, W, H, 0x1b1430, 0).setOrigin(0).setDepth(10);
      const fade = this.add.rectangle(0, 0, W, H, 0x000000, 1).setOrigin(0).setDepth(100);
      this.tweens.add({ targets: fade, alpha: 0, duration: 900, onComplete: () => fade.destroy() });
      // la cámara se acerca despacio a Ane dormida
      // (zoom suave: el botón Saltar sigue dentro de la pantalla)
      this.cameras.main.setZoom(1);
      this.tweens.add({ targets: this.cameras.main, zoom: 1.05, duration: AT.ring, ease: 'Sine.inOut' });

      // Zzz
      this.zzz = this.time.addEvent({ delay: 650, loop: true, callback: () => {
        this.zn = (this.zn || 0) + 1;
        const z = G.ui.text(this, headP.x - 10, headP.y - 26, this.zn % 2 ? 'Z' : 'z', 12, '#ffffff').setDepth(5);
        this.tweens.add({ targets: z, x: z.x - 30, y: z.y - 60, alpha: 0, scale: 1.6, duration: 1600, onComplete: () => z.destroy() });
      } });

      const at = (ms, fn) => this.time.delayedCall(ms, fn);
      at(AT.ring, () => this.ring(T));
      at(AT.music, () => this.playMusic());
      at(AT.wake, () => { this.wakeTxt = this.say(T.wake, headP.x, headP.y - 70, 1300); });
      at(AT.getUp, () => this.getUp(T));
      at(AT.stretch, () => this.stretch(T));
      at(AT.calendar, () => this.calendar(T));
      at(AT.letter, () => this.letter(T));

      // Saltar
      const skip = G.ui.text(this, W - 14, H - G.safe.bottom - 26, T.skip, 9, '#ffffff', { ox: 1 }).setDepth(120).setScrollFactor(0);
      skip.setInteractive({ useHandCursor: true }).on('pointerup', () => { G.sfx.click(); this.finish(); });
    }

    /** Despertador pixel-art 14x14 (rojo con campanas) y halo de luz. */
    makeTextures() {
      if (!this.textures.exists('st-clock')) {
        const P = [
          '.KK........KK.', 'KyyK......KyyK', 'KyyKKKKKKKKyyK', '.KKrrrrrrrrKK.', '.KrrwwwwwwrrK.', 'KrrwwwkwwwwrrK',
          'KrwwwwkwwwwwrK', 'KrwwwwkkkkwwrK', 'KrwwwwwwwwwwrK', 'KrrwwwwwwwwrrK', '.KrrwwwwwwrrK.', '.KKrrrrrrrrKK.', '.Kk.KKKKKK.kK.', '.KK........KK.',
        ];
        const C = { K: 0x1b1430, y: 0xffd23f, r: 0xe0303c, w: 0xfff8e8, k: 0x1b1430 };
        const g = this.make.graphics({ add: false });
        P.forEach((row, y) => [...row].forEach((ch, x) => { if (C[ch]) g.fillStyle(C[ch], 1).fillRect(x, y, 1, 1); }));
        g.generateTexture('st-clock', 14, 14); g.destroy();
      }
      // halo suave detrás del pasaporte
      if (!this.textures.exists('st-glow')) {
        const t = this.textures.createCanvas('st-glow', 96, 96), ctx = t.getContext();
        const gr = ctx.createRadialGradient(48, 48, 2, 48, 48, 48);
        gr.addColorStop(0, 'rgba(255,235,150,1)'); gr.addColorStop(0.45, 'rgba(255,210,63,0.55)'); gr.addColorStop(1, 'rgba(255,210,63,0)');
        ctx.fillStyle = gr; ctx.fillRect(0, 0, 96, 96); t.refresh();
      }
    }

    /**
     * Luz: de noche, un velo azul sobre la habitación; por la mañana, rayos de sol cálidos
     * que entran en diagonal desde la ventana (a la izquierda) con motas de polvo flotando.
     */
    makeLight() {
      const W = this.W, H = this.H;
      this.night = this.add.rectangle(0, 0, W, H, 0x0c1238, 0.62).setOrigin(0).setDepth(9);
      const rays = this.add.graphics().setDepth(3).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
      [[0.04, 0.07, 0.16], [0.14, 0.05, 0.12], [0.22, 0.09, 0.15], [0.35, 0.04, 0.1]].forEach(([y, h, a]) => {
        const y0 = H * y, y1 = y0 + H * h;
        rays.fillStyle(0xffd98a, a).fillPoints([
          { x: -10, y: y0 }, { x: -10, y: y1 }, { x: W * 0.95, y: y1 + H * 0.52 }, { x: W * 0.95, y: y0 + H * 0.44 },
        ], true);
      });
      // resplandor cálido general de la mañana
      this.warm = this.add.rectangle(0, 0, W, H, 0xffb060, 0).setOrigin(0).setDepth(2.9).setBlendMode(Phaser.BlendModes.ADD);
      this.rays = rays;
    }

    /** Amanece: se va la noche, entran los rayos y empiezan a flotar motas de polvo. */
    sunrise() {
      const W = this.W, H = this.H;
      this.tweens.add({ targets: this.night, alpha: 0, duration: 1800, ease: 'Sine.inOut' });
      this.tweens.add({ targets: this.rays, alpha: 1, duration: 1800, ease: 'Sine.inOut', onComplete: () => {
        this.tweens.add({ targets: this.rays, alpha: 0.75, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      } });
      this.tweens.add({ targets: this.warm, fillAlpha: 0.07, duration: 1800 });
      for (let k = 0; k < 10; k++) {
        const x = Phaser.Math.Between(10, W * 0.8), y = H * 0.1 + x * 0.5 + Phaser.Math.Between(0, H * 0.2);
        const m = this.add.rectangle(x, y, 2, 2, 0xfff2c8).setDepth(3.1).setAlpha(0);
        this.tweens.add({ targets: m, alpha: { from: 0, to: 0.9 }, duration: 900, yoyo: true, repeat: -1, delay: 600 + k * 220 });
        this.tweens.add({ targets: m, x: x + Phaser.Math.Between(-14, 14), y: y - Phaser.Math.Between(12, 30), duration: 3200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      }
    }

    ring(T) {
      this.zzz.remove();
      const c = this.clock;
      this.tweens.add({ targets: c, angle: { from: -14, to: 14 }, duration: 60, yoyo: true, repeat: 16, onComplete: () => c.setAngle(0) });
      this.tweens.add({ targets: c, y: c.y - 4, duration: 90, yoyo: true, repeat: 10 });
      for (let k = 0; k < 7; k++) G.sfx.beep(k % 2 ? 1180 : 1480, 0.1, 0.12, k * 0.26);
      const t = G.ui.text(this, Math.min(c.x - 30, this.W - 80), c.y - c.displayHeight - 22, T.alarm, 12, '#ffd23f').setDepth(11).setAngle(-6);
      this.tweens.add({ targets: t, scale: 1.15, duration: 120, yoyo: true, repeat: 7, onComplete: () => this.tweens.add({ targets: t, alpha: 0, duration: 300 }) });
      this.cameras.main.shake(260, 0.004);
      this.tweens.add({ targets: this.cameras.main, zoom: 1, duration: 900, ease: 'Sine.out' });
      this.sunrise();
    }

    /** Texto breve que aparece y se va. */
    say(str, x, y, hold = 900, color = '#ffffff') {
      const t = G.ui.text(this, Phaser.Math.Clamp(x, 90, this.W - 90), Math.max(G.safe.top + 60, y), str, 10, color, { wrap: 300 }).setDepth(13).setAlpha(0);
      this.tweens.add({ targets: t, alpha: 1, y: t.y - 6, duration: 250, hold, yoyo: true, onComplete: () => t.destroy() });
      return t;
    }

    /** Ane salta de la cama: la cama queda revuelta y ella aterriza en la alfombra. */
    getUp(T) {
      const head = this.headP, rug = this.at(BED.rug), S = this.aneS;
      G.sfx.jump();
      // nube de "¡puf!" y la cama pasa a estar vacía
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 2;
        const p = this.add.circle(head.x, head.y, Phaser.Math.Between(8, 14), 0xffffff, 0.95).setDepth(6);
        this.tweens.add({ targets: p, x: head.x + Math.cos(a) * 40, y: head.y + Math.sin(a) * 26, scale: 1.8, alpha: 0, duration: 520, ease: 'Quad.out', onComplete: () => p.destroy() });
      }
      this.tweens.add({ targets: this.bedEmpty, alpha: 1, duration: 160 });
      // fuera el "¿Qué día es hoy...?" para que no se monte con el "¡Arriba!"
      if (this.wakeTxt && this.wakeTxt.active) { this.tweens.killTweensOf(this.wakeTxt); this.wakeTxt.destroy(); }
      this.say(T.getUp, head.x, head.y - 90, 600, '#ffd23f');

      this.shadow = this.add.ellipse(rug.x, rug.y, 60 * S / 1.4, 12, 0x000000, 0.3).setDepth(6.9).setAlpha(0);
      this.ane = G.ui.ane(this, head.x, head.y + 20, 'jump', S * 1.2).setDepth(7);
      const arc = this.tweens.addCounter({ from: 0, to: 1, duration: 620, ease: 'Linear', onUpdate: tw => {
        const u = tw.getValue();
        this.ane.setPosition(head.x + (rug.x - head.x) * u, (head.y + 20) + (rug.y - head.y - 20) * u - Math.sin(u * Math.PI) * 70);
        this.shadow.setAlpha(u * 0.3);
      }, onComplete: () => {
        G.sfx.drop();
        this.ane.setPose('stand').setScale(S * 1.12, S * 0.86);
        this.tweens.add({ targets: this.ane, scaleX: S, scaleY: S, duration: 220, ease: 'Back.out' });
        // polvo al aterrizar
        for (let k = -1; k <= 1; k += 2) {
          const d = this.add.ellipse(rug.x + k * 16, rug.y, 14, 8, 0xfff4d6, 0.9).setDepth(6.9);
          this.tweens.add({ targets: d, x: d.x + k * 24, y: d.y - 6, alpha: 0, scale: 1.8, duration: 420, onComplete: () => d.destroy() });
        }
      } });
      this.arc = arc;
    }

    /** Se estira con los brazos arriba y bosteza. */
    stretch(T) {
      const S = this.aneS, a = this.ane;
      if (!a) return;
      a.setPose('celebrate').setScale(S);
      this.tweens.add({ targets: a, scaleY: S * 1.07, scaleX: S * 0.96, duration: 380, yoyo: true, repeat: 1, ease: 'Sine.inOut',
        onComplete: () => a.setPose('stand').setScale(S) });
      if (!G.sfx.muted) { G.sfx.beep(392, 0.18, 0.05); G.sfx.beep(523, 0.22, 0.05, 0.18); }
      this.say(T.stretch, a.x, a.y - 128 * S - 16, 700);
    }

    /** Calendario grande: sale del cuadro de la pared y pasa hojas del 3 al 10 de diciembre. */
    calendar(T) {
      const W = this.W, H = this.H, cx = W / 2, cy = H * 0.42;
      const wall = this.at(BED.calendar);
      this.tweens.add({ targets: this.dim, fillAlpha: 0.72, duration: 450 });
      const board = this.add.container(wall.x, wall.y).setDepth(20).setScale(0.25).setAlpha(0);
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.35).fillRect(-80, -88, 168, 196);
      g.fillStyle(0x1b1430, 1).fillRect(-84, -94, 168, 196);
      g.fillStyle(0x8a5a32, 1).fillRect(-80, -90, 160, 188);
      board.add(g);
      this.tweens.add({ targets: board, x: cx, y: cy, scale: 1, alpha: 1, duration: 520, ease: 'Back.out' });
      const n = T.calendarDays.length;
      const pages = [];
      for (let i = n - 1; i >= 0; i--) pages[i] = this.page(T.calendarMonths[i], T.calendarDays[i], i === n - 1 ? T.calendarLast : null);
      pages.slice().reverse().forEach(p => board.add(p));
      const rings = this.add.graphics();
      for (let k = -2; k <= 2; k++) rings.fillStyle(0x1b1430, 1).fillRect(k * 28 - 3, -96, 6, 14).fillStyle(0xd8d8e0, 1).fillRect(k * 28 - 2, -95, 4, 12);
      board.add(rings);
      const cap = G.ui.text(this, cx, cy + 130, '', 14, '#ffd23f').setDepth(21);
      let typed = 0;
      this.time.addEvent({ delay: 70, repeat: T.countdown.length - 1, startAt: 0, callback: () => {
        typed++; cap.setText(T.countdown.slice(0, typed));
      } });
      const FLIP = 430;
      for (let i = 0; i < n - 1; i++) {
        this.time.delayedCall(650 + i * FLIP, () => {
          G.sfx.step();
          this.tweens.add({ targets: pages[i], scaleY: 0, y: -100, alpha: 0.4, angle: Phaser.Math.Between(-12, 12), duration: 260, ease: 'Quad.in',
            onComplete: () => pages[i].setVisible(false) });
        });
      }
      this.time.delayedCall(650 + (n - 1) * FLIP + 120, () => {
        G.sfx.unlock();
        this.cameras.main.shake(180, 0.006);
        const last = pages[n - 1];
        this.tweens.add({ targets: last, scale: 1.06, duration: 160, yoyo: true, repeat: 2 });
        // corazones que suben desde el ¡30!
        for (let k = 0; k < 6; k++) {
          const h = this.add.image(cx + Phaser.Math.Between(-70, 70), cy + 60, 'heart').setScale(2).setDepth(22).setAlpha(0);
          this.tweens.add({ targets: h, y: cy - 110 - k * 8, alpha: { from: 1, to: 0 }, duration: 1100, delay: k * 90, ease: 'Sine.out', onComplete: () => h.destroy() });
        }
      });
      this.time.delayedCall(AT.letter - AT.calendar - 400, () => {
        this.tweens.add({ targets: [board, cap], alpha: 0, y: '-=30', duration: 350, onComplete: () => { board.destroy(); cap.destroy(); } });
      });
    }

    page(month, day, last) {
      const p = this.add.container(0, -84);
      const g = this.add.graphics();
      g.fillStyle(0xfff8e8, 1).fillRect(-74, 0, 148, 176);
      g.fillStyle(0xe8dcc4, 1).fillRect(-74, 168, 148, 8);
      g.fillStyle(0xe0303c, 1).fillRect(-74, 0, 148, 36);
      p.add(g);
      p.add(G.ui.text(this, 0, 20, month, 12, '#ffffff', { strokeThickness: 0 }));
      if (last) {
        const h = this.add.graphics();
        h.lineStyle(4, 0xff3b5c, 1).strokeEllipse(0, 92, 112, 84);
        p.add(h);
        p.add(this.add.image(46, 56, 'heart').setScale(2.4));
        p.add(G.ui.text(this, 0, 90, day, 40, '#1b1430', { strokeThickness: 0 }));
        p.add(G.ui.text(this, 0, 150, last, 12, '#ff3b5c', { strokeThickness: 0 }));
      } else {
        p.add(G.ui.text(this, 0, 98, day, 48, '#1b1430', { strokeThickness: 0 }));
      }
      return p;
    }

    /** Llega la carta, sale el pasaporte y Ane lo celebra a su lado. */
    letter(T) {
      const W = this.W, H = this.H, cy = H * 0.38, px = W * 0.38;
      const S = this.aneS, spot = { x: W * 0.79, y: cy + 95 };
      this.tweens.add({ targets: this.dim, fillAlpha: 0.6, duration: 400 });
      // Ane se acerca de un salto (por encima del velo oscuro)
      if (this.ane) {
        const a = this.ane, from = { x: a.x, y: a.y };
        a.setDepth(12).setPose('jump').setScale(S * 1.2);
        if (this.shadow) this.shadow.setVisible(false);
        this.tweens.addCounter({ from: 0, to: 1, duration: 560, onUpdate: tw => {
          const u = tw.getValue();
          a.setPosition(from.x + (spot.x - from.x) * u, from.y + (spot.y - from.y) * u - Math.sin(u * Math.PI) * 60);
        }, onComplete: () => { a.setPose('stand').setScale(S); } });
      }
      const env = this.add.image(-80, cy + 10, 'st-envelope').setScale(3).setDepth(30).setAngle(-12);
      const to = G.ui.text(this, -80, cy + 10, T.letterFrom, 9, '#1b1430', { strokeThickness: 0 }).setDepth(31).setAlpha(0);
      const msg = G.ui.text(this, W / 2, G.safe.top + H * 0.12, T.letterArrives, 10, '#ffffff', { wrap: 320 }).setDepth(31).setAlpha(0);
      G.sfx.jump();
      this.tweens.add({ targets: env, x: px, angle: 0, duration: 700, ease: 'Back.out', onComplete: () => {
        to.setPosition(px - 40, cy + 46).setAlpha(1);
        this.tweens.add({ targets: env, angle: 4, duration: 90, yoyo: true, repeat: 3 });
      } });
      this.tweens.add({ targets: msg, alpha: 1, duration: 300, delay: 300 });
      this.time.delayedCall(1700, () => {
        G.sfx.catch();
        this.cameras.main.flash(220, 255, 240, 200);
        this.tweens.add({ targets: [env, to, msg], alpha: 0, y: '+=40', duration: 400 });
        const glow = this.add.image(px, cy, 'st-glow').setDepth(31).setBlendMode(Phaser.BlendModes.ADD).setScale(0.5).setAlpha(0);
        this.tweens.add({ targets: glow, scale: 2.6, alpha: 0.7, duration: 700, ease: 'Sine.out' });
        const pp = this.add.image(px, cy + 50, 'st-passport').setScale(1).setDepth(32).setAlpha(0);
        this.tweens.add({ targets: pp, y: cy, scale: 3.2, alpha: 1, duration: 700, ease: 'Back.out' });
        this.tweens.add({ targets: pp, angle: { from: -3, to: 3 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: 700 });
        for (let k = 0; k < 16; k++) {
          const a = (k / 16) * Math.PI * 2;
          const sp = this.add.rectangle(px, cy, 4, 4, k % 2 ? 0xffd23f : 0xffffff).setDepth(31);
          this.tweens.add({ targets: sp, x: px + Math.cos(a) * 130, y: cy + Math.sin(a) * 130, alpha: 0, duration: 900, delay: 300, onComplete: () => sp.destroy() });
        }
        this.confetti();
        // ¡Ane lo celebra!
        if (this.ane) {
          const a = this.ane;
          this.time.delayedCall(350, () => {
            a.setPose('celebrate').setScale(S);
            this.tweens.add({ targets: a, y: spot.y - 16, duration: 200, yoyo: true, repeat: 3, ease: 'Quad.out', onComplete: () => a.setY(spot.y) });
            this.say(T.cheer, spot.x, spot.y - 128 * S - 16, 1300, '#ffd23f');
          });
        }
        const title = G.ui.text(this, W / 2, G.safe.top + H * 0.1, T.passportTitle, 14, '#ffd23f', { wrap: 330 }).setDepth(33).setAlpha(0);
        const sub = G.ui.text(this, W / 2, cy + 142, T.passportSub, 9, '#ffffff', { wrap: 330 }).setDepth(33).setAlpha(0);
        this.tweens.add({ targets: [title, sub], alpha: 1, duration: 400, delay: 500 });
        this.time.delayedCall(1700, () => {
          const b = G.ui.button(this, W / 2, Math.min(H - G.safe.bottom - 64, cy + 232), T.start, () => this.finish(), 200, 48).setDepth(40);
          b.setAlpha(0); this.tweens.add({ targets: b, alpha: 1, duration: 300 });
          G.sfx.unlock();
        });
      });
    }

    /** Lluvia de confeti de colores desde arriba. */
    confetti() {
      const cols = [0xffd23f, 0xf05a3c, 0xffffff, 0x3bd16f, 0x9fd3ff, 0xff3b5c];
      for (let k = 0; k < 36; k++) {
        const c = this.add.rectangle(Phaser.Math.Between(0, this.W), -10 - Phaser.Math.Between(0, 120), 4, 6, cols[k % cols.length]).setDepth(35);
        this.tweens.add({ targets: c, y: this.H + 20, x: c.x + Phaser.Math.Between(-40, 40), angle: Phaser.Math.Between(180, 720),
          duration: Phaser.Math.Between(2200, 3400), delay: k * 25, ease: 'Sine.in', onComplete: () => c.destroy() });
      }
    }

    // ---------- Música (WebAudio, se para al salir de la escena) ----------
    playMusic() {
      if (this.music || G.sfx.muted || this.done) return;
      const c = G.sfx.ctx(); if (!c) return;
      const master = c.createGain(); master.gain.value = 0.45; master.connect(c.destination);
      const note = (m, t, d, type, vol) => {
        const o = c.createOscillator(), g = c.createGain();
        o.type = type; o.frequency.value = 440 * Math.pow(2, (m - 69) / 12);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
        g.gain.exponentialRampToValueAtTime(vol * 0.5, t + d * 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + d * 0.95);
        o.connect(g).connect(master); o.start(t); o.stop(t + d);
      };
      const t0 = c.currentTime + 0.05;
      let t = t0;
      // melodía tipo caja de música: triángulo + un toque de onda cuadrada una octava arriba
      SONG.forEach(([m, b]) => { note(m, t, b * BEAT, 'triangle', 0.17); note(m + 12, t, b * BEAT * 0.5, 'square', 0.018); t += b * BEAT; });
      BASS.forEach(([a, b], i) => {
        const bt = t0 + i * 4 * BEAT;
        note(a, bt, BEAT * 1.8, 'triangle', 0.13); note(b, bt + 2 * BEAT, BEAT * 1.8, 'triangle', 0.11);
      });
      // acorde final
      [60, 64, 67, 72].forEach((m, i) => note(m, t + i * 0.03, 1.4, 'triangle', 0.09));
      this.music = { c, master };
      this.unMute = G.sfx.onMute(v => { if (this.music) this.music.master.gain.value = v ? 0 : 0.45; });
    }

    stopMusic() {
      if (this.unMute) { this.unMute(); this.unMute = null; }
      if (!this.music) return;
      const { c, master } = this.music; this.music = null;
      try { master.gain.cancelScheduledValues(c.currentTime); master.gain.setValueAtTime(0, c.currentTime); master.disconnect(); } catch (e) { /* ya cerrado */ }
    }

    finish() {
      if (this.done) return;
      this.done = true;
      G.story.markIntroSeen();
      // la música se apaga suavemente con el fundido
      if (this.music) { const { c, master } = this.music; try { master.gain.setTargetAtTime(0, c.currentTime, 0.08); } catch (e) { /* nada */ } }
      this.cameras.main.fadeOut(350, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Map'));
    }

    relayout() { this.scene.restart(); }
  }

  // Habitación con la cama vacía (generada con tools/make_intro_art.py)
  G.corePreload = G.corePreload || [];
  G.corePreload.push(scene => scene.load.image('st-bedroom-empty', G.asset('assets/story/bedroom_empty.png')));
  G.coreScenes.push(IntroScene);
})(window.AneGame);
