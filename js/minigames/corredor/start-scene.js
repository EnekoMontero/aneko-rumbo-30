/* Portada del corredor: título, reglas con iconos y botón para empezar. */
(function (G) {
  const MG = G.minigames.corredor;

  class CorredorStart extends Phaser.Scene {
    constructor() { super('CorredorStart'); }
    create() {
      MG.makeTextures(this);
      G.showTiltButton(false);
      const { width: W, height: H } = this.scale;
      MG.drawBackdrop(this, W, H);
      const top = G.safe.top, bottom = H - G.safe.bottom;
      G.ui.backToMap(this);
      const ty = top + Math.max(86, H * 0.12);
      G.ui.text(this, W / 2, ty, 'Carrera por\nla ría 6 km', 22, '#ffd23f', { strokeThickness: 8, lineSpacing: 12 });
      G.ui.text(this, W / 2, ty + 62, 'Día 2 · Bilbao', 9, '#ffffff');

      const box = this.add.graphics();
      const bx = 18, by = ty + 86, bw = W - 36, bh = 222;
      box.fillStyle(0x1b1430, 0.78).fillRoundedRect(bx, by, bw, bh, 10).lineStyle(3, 0xffffff, 1).strokeRoundedRect(bx, by, bw, bh, 10);
      const rows = [
        ['r-metro', 0.42, '¡Salta los metros\nque salen de los\nfosteritos!'],
        ['r-agua', 0.9, 'Agua = energía.\nSi se acaba, te agotas'],
        ['r-txakoli', 0.85, 'Txakoli = turbo'],
        ['flag', 1, 'Llega a San Mamés'],
      ];
      rows.forEach(([key, sc, txt], i) => {
        const y = by + 30 + i * 52;
        if (key === 'flag') {
          const g = this.add.graphics();
          g.fillStyle(0x1b1430, 1).fillRect(bx + 36, y - 18, 3, 36);
          g.fillStyle(0xff3b5c, 1).fillRect(bx + 39, y - 18, 18, 7); g.fillStyle(0xffffff, 1).fillRect(bx + 39, y - 11, 18, 6);
        } else this.add.image(bx + 44, y, key).setScale(sc);
        G.ui.text(this, bx + 92, y, txt, 9, '#ffffff', { ox: 0, lineSpacing: 6, strokeThickness: 3 });
      });
      G.ui.text(this, W / 2, by + bh + 26, 'Toca para saltar\nMantén pulsado = más alto', 9, '#ffd23f', { lineSpacing: 8 });

      const ane = G.ui.ane(this, 62, bottom - 26, 'runc1', 0.9);
      let f = 0;
      this.time.addEvent({ delay: 86, loop: true, callback: () => ane.setPose('runc' + ((f = (f + 1) % 4) + 1)) });
      const go = () => this.scene.start('CorredorGame');
      G.ui.button(this, W / 2 + 46, bottom - 62, '¡A correr!', go, 180, 44);
      this.input.keyboard.once('keydown-SPACE', go);
      this.input.keyboard.once('keydown-ENTER', go);
    }
  }

  /** Fondo estático compartido por portada y final: cielo, montes, ría y paseo. */
  MG.drawBackdrop = function (scene, W, H, landmark) {
    const L = MG.config.layout(H), { s: k, groundY: ground, pathTop, riaTop } = L, B = MG.backLayout(L), AH = MG.ART_H;
    MG.drawSky(scene.add.graphics(), W, riaTop + 8);
    scene.add.tileSprite(0, B.farY, W, AH.far, 'r-hills-far').setOrigin(0, 1).tilePositionX = 180;
    scene.add.tileSprite(0, B.hillsY, W, AH.hills, 'r-hills').setOrigin(0, 1);
    scene.add.tileSprite(0, B.cityY, W, AH.city, 'r-city').setOrigin(0, 1).tilePositionX = 140;
    if (landmark) scene.add.image(W / 2, riaTop + 6, landmark).setOrigin(0.5, 1).setScale(1.4 * k);
    scene.add.tileSprite(0, riaTop, W, pathTop - riaTop, 'r-water').setOrigin(0);
    scene.add.tileSprite(0, pathTop, W, AH.path, 'r-path').setOrigin(0);
    scene.add.tileSprite(0, pathTop + 2, W, AH.rail, 'r-rail').setOrigin(0, 1);
    scene.add.tileSprite(0, pathTop + 76, W, H - pathTop - 76, 'r-garden').setOrigin(0);
    scene.add.rectangle(0, 0, W, H, 0x1b1430, landmark ? 0.15 : 0.3).setOrigin(0);
    return { ground };
  };
  MG.scenes.push(CorredorStart);
})(window.AneGame);
