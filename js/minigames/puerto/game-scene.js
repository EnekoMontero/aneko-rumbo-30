/* "Cruzar el puerto": rejilla tipo Frogger. Terminal de contenedores (camiones) + ría (barcos). */
(function (G) {
  const MG = G.minigames.puerto, CFG = MG.config;
  const GOAL = CFG.ROWS - 1;
  const ART = CFG.TILE;            // px de arte por casilla (el arte se escala T / ART)
  const BG_CUT = 684;              // fila de bg_puerto.jpg donde acaba el horizonte (borde del muelle lejano)

  class PuertoGame extends Phaser.Scene {
    constructor() { super('PuertoGame'); }

    create() {
      MG.makeTextures(this);
      G.showTiltButton(false);
      // Phaser reutiliza la instancia: reiniciar TODO el estado aquí
      Object.assign(this, {
        lives: CFG.LIVES, crossing: 0, over: false, hopping: false, queued: null, dead: false,
        invulnUntil: 0, elapsed: 0, lanes: [], walls: [], row: 0, T: 0, ax: 0, ride: null, maxRow: 0,
      });
      // estado compartido con CFG.blocked (y la prueba automática): contenedores de esta partida
      this.blocked = { 0: CFG.BLOCKED[0].slice(), [CFG.CONT_ROW]: CFG.pickYardGaps() };
      CFG.live = { blocked: this.blocked, scene: this };
      this.events.once('shutdown', () => { if (CFG.live && CFG.live.scene === this) CFG.live = null; });
      this.computeLayout();
      // horizonte: la parte de arriba de bg_puerto.jpg (cielo, grúas, muelle lejano), como en la escena final
      this.sky = this.add.rectangle(0, 0, 10, 10, 0x6a3a6e).setOrigin(0).setDepth(0);
      this.bg = this.add.image(0, 0, 'pt-bg').setOrigin(0.5, 0).setCrop(0, 0, 720, BG_CUT).setDepth(0);
      this.seam = this.add.rectangle(0, 0, 10, 2, 0x1b1430, 0.85).setOrigin(0, 1).setDepth(2);
      this.waterFrame = 0;
      this.buildRows();
      this.buildWalls(false);
      this.buildLanes();
      this.buildAne();
      this.buildHud();
      this.placeAll();
      this.respawn(false);

      // Entrada: deslizar = una casilla en esa dirección; toque corto = avanzar
      this.input.on('pointerdown', p => { this.swipe = { x: p.x, y: p.y }; });
      this.input.on('pointerup', p => {
        if (!this.swipe) return;
        const dx = p.x - this.swipe.x, dy = p.y - this.swipe.y; this.swipe = null;
        if (Math.hypot(dx, dy) < CFG.SWIPE_PX) return this.move(0, 1);
        if (Math.abs(dx) > Math.abs(dy)) this.move(Math.sign(dx), 0); else this.move(0, -Math.sign(dy));
      });
      const K = { UP: [0, 1], W: [0, 1], SPACE: [0, 1], DOWN: [0, -1], S: [0, -1], LEFT: [-1, 0], A: [-1, 0], RIGHT: [1, 0], D: [1, 0] };
      Object.entries(K).forEach(([k, d]) => this.input.keyboard.on('keydown-' + k, () => this.move(...d)));
      // ayuda inicial en el cielo, sobre la rejilla (no tapa ningún carril)
      this.hint = this.add.container(0, 0).setDepth(80);
      const ht = G.ui.text(this, 0, 0, 'Desliza para moverte\ntoca para avanzar', 9, '#ffffff', { lineSpacing: 6 });
      const hb = this.add.graphics().fillStyle(0x1b1430, 0.7).fillRoundedRect(-ht.width / 2 - 10, -ht.height / 2 - 6, ht.width + 20, ht.height + 12, 8);
      this.hint.add([hb, ht]);
      this.placeHint();
      this.tweens.add({ targets: this.hint, alpha: 0, delay: 3800, duration: 600, onComplete: () => { this.hint.destroy(); this.hint = null; } });
    }

    // ---------- Disposición ----------
    computeLayout() {
      const { width: W, height: H } = this.scale;
      this.W = W; this.H = H;
      if (!this.T) this.T = Math.min(CFG.TILE, Math.floor((H - G.safe.top - G.safe.bottom - 74) / CFG.ROWS));
      this.S = this.T / ART;
      this.gw = CFG.COLS * this.T; this.gx0 = Math.round((W - this.gw) / 2);
      this.gBottom = Math.round(H - G.safe.bottom - 8);
      this.gTop = this.gBottom - CFG.ROWS * this.T;
    }
    rowY(r) { return this.gBottom - (r + 0.5) * this.T; }           // centro de la fila
    rowBottom(r) { return this.gBottom - r * this.T; }
    colX(c) { return this.gx0 + (c + 0.5) * this.T; }
    colOf(x) { return Phaser.Math.Clamp(Math.round((x - this.gx0) / this.T - 0.5), 0, CFG.COLS - 1); }
    depthOf(r) { return 10 + (CFG.ROWS - r) * 2; }                  // las filas de abajo tapan a las de arriba
    /** Altura de los pies de Ane en la fila r (en el agua, sobre la cubierta del barco). */
    footY(r) { return this.rowBottom(r) - this.T * (CFG.isWater(r) ? 0.42 : 0.17); }
    isBlocked(r, c) { return !!(this.blocked[r] && this.blocked[r].includes(c)); }
    relayout() { this.computeLayout(); this.placeAll(); this.placeHud(); this.placeHint(); }
    placeHint() { if (this.hint) this.hint.setPosition(this.W / 2, Math.max(G.safe.top + 84, this.gTop - 34)); }

    buildRows() {
      this.rows = [];
      for (let r = 0; r < CFG.ROWS; r++) {
        const key = r === GOAL ? 'pt-tile_goal' : r === 0 ? 'pt-tile_quay' : r === CFG.MID_ROW ? 'pt-tile_quay_mid'
          : r === CFG.CONT_ROW ? 'pt-tile_yard' : CFG.isWater(r) ? 'pt-tile_water0' : 'pt-tile_asphalt';
        const ts = this.add.tileSprite(0, 0, CFG.COLS * ART, ART, key).setOrigin(0).setDepth(1);
        ts.r = r; this.rows.push(ts);
      }
      // rayas de carril entre filas de asfalto contiguas
      this.dashes = [];
      for (let r = 1; r < CFG.ROWS; r++) if (CFG.isRoad(r) && CFG.isRoad(r - 1))
        this.dashes.push(this.add.tileSprite(0, 0, CFG.COLS * ART, 4, 'pt-tile_dash').setOrigin(0, 0.5).setDepth(2).setData('r', r));
      // bolardos en la albardilla del muelle intermedio, ENTRE columnas (decorado, no estorban)
      this.bollards = [0.12, 3, 6, 8.88].map(x => ({ x, img: this.add.image(0, 0, 'pt-bollard').setOrigin(0.5, 1) }));
      // bordes fuera de la rejilla (pantallas anchas o casilla menor de 40)
      this.sideL = this.add.rectangle(0, 0, 10, 10, 0x1b1430).setOrigin(0).setDepth(60);
      this.sideR = this.add.rectangle(0, 0, 10, 10, 0x1b1430).setOrigin(0).setDepth(60);
    }

    /** Contenedores fijos (muros). Cada uno ocupa exactamente su casilla. drop = animación de grúa. */
    buildWalls(drop) {
      this.walls.forEach(w => w.img.destroy());
      this.walls = [];
      const cols = ['pt-cont_red', 'pt-cont_teal', 'pt-cont_yellow', 'pt-cont_blue'];
      let n = Phaser.Math.Between(0, 3);
      Object.entries(this.blocked).forEach(([row, cs]) => cs.forEach(c => {
        const img = this.add.image(0, 0, cols[n++ % 4]).setOrigin(0.5, 1);
        this.walls.push({ img, c, row: +row });
      }));
      this.placeWalls();
      if (drop) this.walls.filter(w => w.row === CFG.CONT_ROW).forEach((w, i) => {
        const y = w.img.y;
        w.img.y -= this.T * 0.8; w.img.alpha = 0;
        this.tweens.add({ targets: w.img, y, alpha: 1, duration: 260, delay: i * 40, ease: 'Bounce.out' });
      });
    }
    placeWalls() {
      this.walls.forEach(w => w.img.setScale(this.S).setPosition(this.colX(w.c), this.rowBottom(w.row)).setDepth(this.depthOf(w.row) + 0.5));
    }

    // Carriles con aparición aleatoria: cada carril es una cadena de objetos que entra por un lado y sale
    // por el otro. Detrás del último se añade uno nuevo con hueco = mínimo seguro + extra aleatorio y
    // tipo aleatorio. Todos los objetos del carril van a la misma velocidad, así que los huecos no se
    // cierran nunca: si al aparecer hay hueco pasable, lo sigue habiendo.
    buildLanes() {
      // sentido aleatorio por carril, pero nunca todos los de la carretera (o todos los del agua) iguales
      const dirs = (n) => {
        for (;;) { const d = Array.from({ length: n }, () => (Math.random() < 0.5 ? -1 : 1)); if (Math.abs(d.reduce((a, b) => a + b, 0)) < n) return d; }
      };
      const mk = (rows, table, water) => {
        const d = dirs(rows.length);
        rows.forEach((r, i) => {
          const lane = { r, water, L: table[r], dir: d[i], jit: 1, objs: [] };
          this.lanes.push(lane);
          this.spawnObj(lane, this.gx0 + Phaser.Math.FloatBetween(0.1, 0.9) * this.gw);
          this.fillLane(lane);
        });
      };
      mk(Object.keys(CFG.ROAD).map(Number), CFG.ROAD, false);
      mk(Object.keys(CFG.WATER).map(Number), CFG.WATER, true);
      this.rollSpeeds();
    }
    /** Variación de velocidad de cada carril (±SPEED_JITTER), se re-sortea en cada cruce. */
    rollSpeeds() {
      const J = CFG.SPEED_JITTER;
      this.lanes.forEach(l => (l.jit = Phaser.Math.FloatBetween(1 - J, 1 + J)));
    }
    spawnObj(lane, x) {
      const T = this.T, S = this.S, kind = Phaser.Utils.Array.GetRandom(lane.L.kinds);
      const img = this.add.image(0, 0, 'pt-' + kind).setFlipX(lane.dir < 0).setScale(S).setOrigin(0.5, 1).setDepth(this.depthOf(lane.r));
      const w = img.width * S;
      // reflejo en el agua: misma silueta volteada, aplastada, oscura y translúcida
      const refl = lane.water ? this.add.image(0, 0, 'pt-' + kind).setFlip(lane.dir < 0, true).setOrigin(0.5, 0)
        .setScale(S, T * 0.16 / img.height).setTint(0x16365e).setAlpha(0.45).setDepth(this.depthOf(lane.r) - 0.5) : null;
      let gap = lane.L.gap[0] + Math.random() * lane.L.gap[1];                  // hueco hasta el siguiente (casillas)
      if (lane.water) {
        // espera máxima a un barco con la velocidad más baja posible del carril (cruce 1, variación mínima)
        const vMin = lane.L.v * (1 - CFG.SPEED_JITTER) / ART;                    // casillas/s
        gap = Math.min(gap, CFG.WATER_MAX_WAIT * vMin - 2 * CFG.BOAT_EDGE);
      }
      gap *= T;
      if (x === undefined) {                                                     // detrás del último
        const last = lane.objs[lane.objs.length - 1];
        x = last.p - lane.dir * (last.w / 2 + last.gap + w / 2);
      }
      const o = { img, refl, kind, w, p: x, gap, ph: Math.random() * 6.28 };
      lane.objs.push(o);
      return o;
    }
    fillLane(lane) {
      // mantener la cola encadenada hasta 3 casillas fuera de pantalla por el lado de entrada
      const entry = lane.dir > 0 ? this.gx0 - this.T * 3 : this.gx0 + this.gw + this.T * 3;
      for (let guard = 0; guard < 40; guard++) {
        const last = lane.objs[lane.objs.length - 1];
        const tail = last.p - lane.dir * (last.w / 2 + last.gap);
        if (lane.dir > 0 ? tail < entry : tail > entry) break;
        this.spawnObj(lane);
      }
      // retirar los que ya salieron por el otro lado (nunca el barco en el que va Ane)
      const exit = lane.dir > 0 ? this.gx0 + this.gw + this.T : this.gx0 - this.T;
      while (lane.objs.length > 1) {
        const o = lane.objs[0];
        if (this.ride && this.ride.o === o) break;
        if (lane.dir > 0 ? o.p - o.w / 2 > exit : o.p + o.w / 2 < exit) { o.img.destroy(); if (o.refl) o.refl.destroy(); lane.objs.shift(); } else break;
      }
    }
    laneV(lane) { return lane.dir * lane.L.v * lane.jit * CFG.SPEED_MUL[Math.min(this.crossing, CFG.SPEED_MUL.length - 1)] * this.T / ART; }
    laneOf(row) { return this.lanes.find(l => l.r === row); }

    placeAll() {
      const T = this.T, W = this.W, S = this.S;
      // el borde del muelle lejano del fondo queda justo encima de la meta; si sobra alto, se amplía
      const k = Math.max(0.5, W / 720, (this.gTop + 4) / BG_CUT);
      this.bg.setScale(k).setPosition(W / 2, this.gTop - BG_CUT * k);
      this.sky.setSize(W, Math.max(0, this.bg.y + 2));
      this.seam.setPosition(0, this.gTop + 1).setSize(W, 3);
      this.rows.forEach(ts => ts.setScale(S).setPosition(this.gx0, this.gBottom - (ts.r + 1) * T));
      this.dashes.forEach(d => d.setScale(S).setPosition(this.gx0, this.gBottom - d.getData('r') * T));
      this.bollards.forEach(b => b.img.setScale(S).setPosition(this.gx0 + b.x * T, this.rowBottom(CFG.MID_ROW + 1) + 8 * S).setDepth(this.depthOf(CFG.MID_ROW) + 0.2));
      this.placeWalls();
      this.sideL.setSize(this.gx0, this.H); this.sideR.setPosition(this.gx0 + this.gw, 0).setSize(Math.max(0, W - this.gx0 - this.gw), this.H);
      this.placeLanes();
      if (!this.hopping) this.placeAne();
    }
    placeLanes() {
      const t = this.time.now / 1000, T = this.T;
      this.lanes.forEach(l => l.objs.forEach(o => {
        if (!l.water) return o.img.setPosition(o.p, this.rowBottom(l.r) - 1).setDepth(this.depthOf(l.r));
        // barcos: el lienzo acaba en el borde de la fila; leve balanceo
        const bob = Math.round(Math.sin(t * 2.2 + o.ph) * 1.2);
        o.img.setPosition(o.p, this.rowBottom(l.r) + bob).setDepth(this.depthOf(l.r));
        o.refl.setPosition(o.p, this.rowBottom(l.r) - T * 0.08).setAlpha(0.38 + 0.08 * Math.sin(t * 5 + o.ph));
      }));
    }

    // ---------- Ane ----------
    buildAne() {
      this.aneK = this.T * CFG.ANE_H / 112;      // 112 px = alto de la pose de pie original
      this.aneShadow = this.add.ellipse(0, 0, this.T * 0.62, this.T * 0.2, 0x140c28, 0.45);
      const c = this.ane = this.add.container(0, 0);
      const img = this.add.image(0, 0, MG.aneTexture(this, 'stand', this.aneK)).setOrigin(0.5, 1);
      c.add(img);
      c.setPose = (p) => { if (c.pose !== p) { c.pose = p; img.setTexture(MG.aneTexture(this, p, this.aneK)); } return c; };
      c.setFlip = (f) => { img.setFlipX(f); return c; };
      // pre-genera todas las poses que se usan para no crear lienzos en mitad de la partida
      ['jump', 'runc2', 'celebrate', 'tired'].forEach(p => MG.aneTexture(this, p, this.aneK));
    }
    placeAne() {
      this.ane.setPosition(this.ax, this.footY(this.row)).setDepth(this.depthOf(this.row) + 1);
      this.aneShadow.setPosition(this.ax, this.footY(this.row) - 1).setDepth(this.depthOf(this.row) + 0.9);
    }

    // ---------- HUD ----------
    buildHud() {
      this.hearts = [];
      for (let i = 0; i < CFG.LIVES; i++) this.hearts.push(this.add.image(0, 0, 'heart').setScale(2).setDepth(90));
      this.lblCross = G.ui.text(this, 0, 0, '', 10, '#ffd23f', { ox: 0 }).setDepth(90);
      this.banner = G.ui.text(this, this.W / 2, 0, '', 16, '#ffd23f', { strokeThickness: 7, lineSpacing: 10 }).setDepth(95).setAlpha(0);
      this.placeHud(); this.updateHud();
    }
    placeHud() {
      const y = G.safe.top + 20;
      this.hearts.forEach((h, i) => h.setPosition(18 + i * 26, y));
      this.lblCross.setPosition(10, y + 28);
      this.banner.setPosition(this.W / 2, this.rowY(CFG.MID_ROW) - 4);
    }
    updateHud() {
      this.hearts.forEach((h, i) => h.setTexture(i < this.lives ? 'heart' : 'heart-empty'));
      this.lblCross.setText(`Cruce ${Math.min(this.crossing + 1, CFG.CROSSINGS)}/${CFG.CROSSINGS}`);
    }
    showBanner(txt, color = '#ffd23f', ms = 1100) {
      this.banner.setText(txt).setColor(color).setAlpha(1).setScale(0.6);
      this.tweens.killTweensOf(this.banner);
      this.tweens.add({ targets: this.banner, scale: 1, duration: 180, ease: 'Back.out' });
      this.tweens.add({ targets: this.banner, alpha: 0, delay: ms, duration: 350 });
    }

    // ---------- Movimiento ----------
    move(dx, dy) {
      if (this.over || this.dead) return;
      if (this.hopping) { this.queued = [dx, dy]; return; }
      const nr = this.row + dy;
      if (nr < 0 || nr > GOAL) return;
      let nx = this.ax + dx * this.T;
      if (nx < this.gx0 + this.T * 0.3 || nx > this.gx0 + this.gw - this.T * 0.3) return;
      if (!CFG.isWater(nr)) nx = this.colX(this.colOf(nx));               // en tierra se encaja en la casilla
      if (this.isBlocked(nr, this.colOf(nx))) { G.sfx.beep(180, 0.06, 0.08); this.bump(dx, dy); return; }
      this.hopping = true; this.ride = null; this.hopFrom = this.row; this.hopK = 0;
      this.row = nr; this.maxRow = Math.max(this.maxRow, nr);
      this.ane.setPose(dy > 0 ? 'jump' : dx ? 'runc2' : 'stand').setFlip(dx < 0);
      this.ane.setDepth(this.depthOf(Math.min(nr, this.hopFrom)) + 1);  // al bajar no se mete detrás de la fila de origen
      const y0 = this.ane.y, y1 = this.footY(nr), x0 = this.ax;
      G.sfx.step();
      this.tweens.addCounter({ from: 0, to: 1, duration: CFG.HOP_MS, onUpdate: tw => {
        const k = tw.getValue(); this.hopK = k;
        this.ax = x0 + (nx - x0) * k;
        const gy = y0 + (y1 - y0) * k;
        this.ane.setPosition(this.ax, gy - Math.sin(k * Math.PI) * this.T * 0.35);
        this.aneShadow.setPosition(this.ax, gy - 1);
      }, onComplete: () => { if (this.dead && !this.over) return; this.ax = nx; this.hopping = false; this.land(); } });
    }
    bump(dx, dy) {
      this.tweens.add({ targets: this.ane, x: this.ax + dx * 5, y: this.ane.y - dy * 5, duration: 60, yoyo: true });
    }
    land() {
      if (this.over || this.dead) return;
      this.placeAne();
      this.ane.setPose(this.row === GOAL ? 'celebrate' : 'stand');
      if (this.row === GOAL) return this.crossed();
      if (CFG.isWater(this.row)) {
        const o = this.boatAt(this.ax, this.row);
        if (!o) return this.lose('water');
        // se sube al barco: a partir de ahora va pegada a él (no puede "resbalar" por desfase de fotogramas)
        this.ride = { lane: this.laneOf(this.row), o, off: this.ax - o.p };
      }
      if (this.queued) { const q = this.queued; this.queued = null; this.move(...q); }
    }
    /** Barco del carril `row` bajo la x dada (dentro de dt s), o null. */
    boatAt(x, row, dt = 0) {
      const lane = this.lanes.find(l => l.r === row && l.water);
      if (!lane) return null;
      const v = this.laneV(lane);
      return lane.objs.find(o => Math.abs(o.p + v * dt - x) < o.w / 2 - this.T * CFG.BOAT_EDGE) || null;
    }
    boatUnder(x = this.ax, row = this.row, dtAhead = 0) { return this.boatAt(x, row, dtAhead) ? this.laneOf(row) : null; }
    /** Semianchura con la que un vehículo atropella a Ane (centro a centro). */
    hitHalf(o) { return o.w / 2 - 2 * this.S + this.T * 0.2; }
    /** Para la prueba automática: ¿habrá un vehículo/agua/contenedor peligroso en (row, x) dentro de dt s? */
    dangerAt(row, x, dt) {
      if (CFG.isWater(row)) return !this.boatAt(x, row, dt);
      const lane = this.lanes.find(l => l.r === row && !l.water);
      if (!lane) return this.isBlocked(row, this.colOf(x));
      const v = this.laneV(lane);
      return lane.objs.some(o => Math.abs(o.p + v * dt - x) < this.hitHalf(o) + this.T * 0.25);
    }

    // ---------- Bucle ----------
    update(time, delta) {
      if (this.over) return;
      const dt = Math.min(delta, 50) / 1000;
      this.elapsed += delta;
      this.lanes.forEach(l => { const v = this.laneV(l); l.objs.forEach(o => (o.p += v * dt)); this.fillLane(l); });
      this.placeLanes();
      // agua animada: 4 fotogramas de olas + deriva lenta en el sentido de la corriente de cada carril
      const wf = Math.floor(time / 240) % 4, newF = wf !== this.waterFrame; this.waterFrame = wf;
      this.rows.forEach(ts => {
        if (!CFG.isWater(ts.r)) return;
        if (newF) ts.setTexture('pt-tile_water' + wf);
        ts.tilePositionX -= (this.laneOf(ts.r).dir * 3 + 1.5) * dt;
      });
      if (this.dead) return;
      // en el agua, Ane viaja pegada a su barco
      if (this.ride && !this.hopping) {
        this.ax = this.ride.o.p + this.ride.off;
        if (this.ax < this.gx0 + 2 || this.ax > this.gx0 + this.gw - 2) return this.lose('water');
        this.placeAne();
        this.ane.y = this.footY(this.row) + Math.round(Math.sin(time / 1000 * 2.2 + this.ride.o.ph) * 1.2);   // se balancea con él
      }
      // atropellos
      // mientras salta, cuenta la fila de origen hasta la mitad del salto (no se choca al despegar)
      const hitRow = this.hopping && this.hopK < 0.5 ? this.hopFrom : this.row;
      if (CFG.isRoad(hitRow) && time > this.invulnUntil) {
        const lane = this.lanes.find(l => l.r === hitRow && !l.water);
        if (lane.objs.some(o => Math.abs(o.p - this.ax) < this.hitHalf(o))) this.lose('truck');
      }
      this.ane.alpha = time < this.invulnUntil ? (Math.floor(time / 80) % 2 ? 0.4 : 1) : 1;
    }

    // ---------- Vidas y cruces ----------
    lose(why) {
      if (this.dead || this.over) return;
      this.dead = true; this.queued = null; this.ride = null;
      this.lives--; this.updateHud();
      this.cameras.main.shake(180, 0.006);
      if (why === 'water') {
        G.sfx.drop();
        this.ane.setVisible(false); this.aneShadow.setVisible(false);
        this.splash(this.ax, this.footY(this.row));
        this.showBanner('¡Al agua!', '#9fe3ff', 700);
      } else {
        G.sfx.hit();
        this.ane.setPose('tired');
        this.tweens.add({ targets: this.ane, angle: 90 * (Math.random() < 0.5 ? -1 : 1), duration: 160 });
        this.showBanner('¡Cuidado!', '#ff5a5a', 700);
      }
      G.sfx.lifeLost();
      const h = this.hearts[this.lives];
      if (h) this.tweens.add({ targets: h, scale: 3.2, duration: 120, yoyo: true });
      if (this.lives <= 0) {
        this.over = true;
        G.sfx.gameOver();
        this.time.delayedCall(1100, () => this.scene.start('PuertoEnd', { win: false, crossings: this.crossing }));
      } else this.time.delayedCall(800, () => this.respawn(true));
    }
    respawn(blink) {
      this.tweens.killTweensOf(this.ane);
      this.dead = false; this.hopping = false; this.queued = null; this.ride = null;
      this.row = 0; this.ax = this.colX(CFG.START_COL);
      this.ane.setVisible(true).setAngle(0).setAlpha(1);
      this.ane.setPose('stand').setFlip(false);
      this.aneShadow.setVisible(true);
      this.placeAne();
      if (blink) this.invulnUntil = this.time.now + CFG.INVULN_MS;
    }
    crossed() {
      this.crossing++;
      this.updateHud();
      G.sfx.unlock();
      this.sparkles(this.ax, this.rowY(GOAL) - this.T * 0.6);
      if (this.crossing >= CFG.CROSSINGS) {
        this.over = true;
        const secs = Math.round(this.elapsed / 1000);
        G.progress.recordScore(CFG.id, Math.max(1, 999 - secs) + this.lives * 100);
        G.progress.complete(CFG.id);
        G.sfx.win();
        this.showBanner('¡Puerto\ncruzado!', '#ffd23f', 1500);
        this.ane.setPose('celebrate');
        this.time.delayedCall(1700, () => this.scene.start('PuertoEnd', { win: true, crossings: this.crossing, secs, lives: this.lives }));
        return;
      }
      this.dead = true;   // breve pausa de celebración
      this.showBanner(`¡Cruce ${this.crossing}/${CFG.CROSSINGS}!\nAhora más rápido`, '#ffd23f', 1000);
      // nuevo cruce: otro patio de contenedores y otro reparto de velocidades (Ane está en la meta, lejos)
      this.blocked[CFG.CONT_ROW] = CFG.pickYardGaps(this.blocked[CFG.CONT_ROW]);
      this.rollSpeeds();
      this.time.delayedCall(350, () => this.buildWalls(true));
      this.time.delayedCall(1200, () => this.respawn(false));
    }
    splash(x, y) {
      for (let i = 0; i < 14; i++) {
        const d = this.add.image(x, y, 'pt-drop').setDepth(70);
        const a = Math.PI * (0.15 + 0.7 * Math.random()), sp = Phaser.Math.Between(20, 46);
        this.tweens.add({ targets: d, x: x + Math.cos(a) * sp * (Math.random() < 0.5 ? -1 : 1), y: y - Math.sin(a) * sp, alpha: 0,
          duration: Phaser.Math.Between(350, 600), ease: 'Quad.out', onComplete: () => d.destroy() });
      }
      const ring = this.add.ellipse(x, y + 4, 10, 4).setStrokeStyle(2, 0xd8f2ff).setDepth(69);
      this.tweens.add({ targets: ring, scaleX: 4, scaleY: 3, alpha: 0, duration: 600, onComplete: () => ring.destroy() });
    }
    sparkles(x, y) {
      for (let i = 0; i < 12; i++) {
        const s = this.add.rectangle(x, y, 4, 4, 0xffe066).setDepth(70);
        const a = (i / 12) * Math.PI * 2;
        this.tweens.add({ targets: s, x: x + Math.cos(a) * 36, y: y + Math.sin(a) * 36, alpha: 0, duration: 500, onComplete: () => s.destroy() });
      }
    }
  }
  MG.scenes.push(PuertoGame);
})(window.AneGame);
