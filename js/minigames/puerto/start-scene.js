/* Portada de "Cruzar el puerto": cómo se juega y botón. */
(function (G) {
  const MG = G.minigames.puerto, CFG = MG.config;

  class PuertoStart extends Phaser.Scene {
    constructor() { super('PuertoStart'); }
    create() {
      MG.makeTextures(this);
      G.showTiltButton(false);
      const { width: W, height: H } = this.scale;
      const top = G.safe.top, bottom = H - G.safe.bottom;
      const compact = bottom - top < 640;          // móviles bajos (375x667 y similares)
      MG.drawBackdrop(this, 0.3);
      G.ui.backToMap(this);
      const ty = top + (compact ? 70 : Math.max(78, H * 0.1));
      G.ui.text(this, W / 2, ty, 'Cruzar\nel puerto', 22, '#ffd23f', { strokeThickness: 8, lineSpacing: 12 });
      G.ui.text(this, W / 2, ty + 58, 'Día 6 · Puerto de Bilbao', 9, '#ffffff');

      // Recuadro de instrucciones: cada bloque se coloca debajo del anterior según su alto real
      const bx = 14, bw = W - 28, by = ty + 76;
      const box = this.add.graphics();
      let y = by + 14;
      // dibujitos: un camión que va y viene sobre asfalto y un remolcador sobre el agua (arte a 1:1)
      const half = Math.floor((bw - 20) / 2);
      this.add.tileSprite(bx + 10, y, half, 40, 'pt-tile_asphalt').setOrigin(0);
      this.add.tileSprite(bx + 10 + half, y, bw - 20 - half, 40, 'pt-tile_water1').setOrigin(0);
      const truck = this.add.image(bx + 56, y + 39, 'pt-truck_blue').setOrigin(0.5, 1);
      this.tweens.add({ targets: truck, x: bx + bw / 2 - 52, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut',
        onYoyo: () => truck.setFlipX(true), onRepeat: () => truck.setFlipX(false) });
      const tug = this.add.image(bx + bw * 0.75 + 4, y + 40, 'pt-tug').setOrigin(0.5, 1);
      this.tweens.add({ targets: tug, y: y + 41, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.add.graphics().lineStyle(2, 0x1b1430, 1).strokeRect(bx + 10, y, bw - 20, 40);
      y += 40 + 18;
      const para = (str, color, size = 9) => {
        const t = G.ui.text(this, W / 2, y, str, size, color, { lineSpacing: 6, strokeThickness: 3, oy: 0 });
        y += t.height + 12;
        return t;
      };
      para('Esquiva los camiones de\nla terminal de contenedores', '#ffffff');
      para('Los contenedores no se mueven:\npasa por los huecos', '#ffb27a');
      para('En el agua, salta de barco\nen barco: ¡no te caigas!', '#9fe3ff');
      para(`Desliza para moverte\n(toca para avanzar)\n¡${CFG.CROSSINGS} cruces, cada uno más rápido!`, '#ffd23f');
      para('Teclado: flechas o W A S D', '#d0c8e8');
      const bh = y - by + 4;
      // (el recuadro se creó antes que su contenido, así queda detrás)
      box.fillStyle(0x1b1430, 0.86).fillRoundedRect(bx, by, bw, bh, 10).lineStyle(3, 0xffffff, 1).strokeRoundedRect(bx, by, bw, bh, 10);

      // Ane y botón abajo, bajo el recuadro
      const aneY = bottom - 30;
      const ane = G.ui.ane(this, 58, aneY, 'stand', compact ? 0.7 : 0.8);
      this.time.addEvent({ delay: 420, loop: true, callback: () => this.tweens.add({ targets: ane, y: aneY - 10, duration: 110, yoyo: true }) });
      const go = () => this.scene.start('PuertoGame');
      G.ui.button(this, W / 2 + 40, aneY - 40, '¡A cruzar!', go, 190, 44);
      this.input.keyboard.once('keydown-SPACE', go);
      this.input.keyboard.once('keydown-ENTER', go);
    }
  }
  MG.scenes.push(PuertoStart);
})(window.AneGame);
