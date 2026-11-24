/*
 * Arte de Bali. El fondo grande (playas, palmeras, sombrillas, mar con profundidad y fondo marino)
 * es un PNG que se repite en vertical (assets/bali/bg_sea.png, generado con tools/make_bali_art.py).
 * Aquí se generan por código las piezas pequeñas (sombra, burbuja, pez de decorado, aviso "!") y
 * MG.makeSea monta las capas animadas: fondo que se desplaza, cáusticas, destellos, peces y espuma.
 */
(function (G) {
  const MG = G.minigames.bali;
  MG.makeTextures = (scene) => {
    if (scene.textures.exists('bl-shadow')) return;
    const tex = (key, w, h, draw) => { const g = scene.make.graphics({ add: false }); draw(g); g.generateTexture(key, w, h); g.destroy(); };
    // Sombra sobre el fondo marino (debajo de Ane, tortugas, medusas y dragones): separa lo jugable del decorado
    tex('bl-shadow', 28, 16, g => {
      g.fillStyle(0x062a3a, 0.5).fillEllipse(14, 8, 28, 16);
      g.fillStyle(0x062a3a, 0.5).fillEllipse(14, 8, 20, 10);
    });
    // Gota / burbuja
    tex('bl-bubble', 4, 4, g => {
      g.fillStyle(0xe8ffff, 1).fillRect(1, 0, 2, 4).fillRect(0, 1, 4, 2);
      g.fillStyle(0xffffff, 1).fillRect(1, 1, 1, 1);
    });
    // Pez pequeño de decorado: silueta oscura y sin contorno (no se confunde con lo jugable)
    tex('bl-fish', 8, 4, g => {
      g.fillStyle(0x0a4660, 1).fillRect(2, 0, 4, 4).fillRect(1, 1, 6, 2).fillRect(0, 0, 1, 1).fillRect(0, 3, 1, 1).fillRect(0, 1, 2, 2);
    });
    // Destello del sol en la superficie
    tex('bl-glint', 5, 3, g => {
      g.fillStyle(0xffffff, 1).fillRect(1, 1, 3, 1).fillRect(2, 0, 1, 3);
    });
    // Aviso "!" de dragón
    tex('bl-warn', 14, 18, g => {
      g.fillStyle(0x1b1430, 1).fillRoundedRect(0, 0, 14, 18, 3);
      g.fillStyle(0xffd23f, 1).fillRect(5, 3, 4, 8).fillRect(5, 13, 4, 3);
    });
  };

  /**
   * Monta el mar con todas sus capas en profundidades D..D+4 (por debajo de lo jugable).
   * Devuelve { update(dt, scroll), resize() }: update lo llama la escena cada fotograma con el
   * desplazamiento del mar (px), resize al cambiar el alto lógico.
   */
  MG.makeSea = (scene, D = 0) => {
    const W = scene.scale.width, B = MG.config.BEACH;
    let H = scene.scale.height;
    const bg = scene.add.tileSprite(0, 0, W, H, 'bl-sea').setOrigin(0).setDepth(D);
    // Peces de decorado (bancos pequeños que cruzan despacio, bajo las cáusticas)
    const fish = [];
    const school = (first) => {
      const n = Phaser.Math.Between(4, 7), dir = Math.random() < 0.5 ? 1 : -1;
      const x0 = dir > 0 ? B - 30 : W - B + 30, y0 = first ? Phaser.Math.Between(40, H - 40) : Phaser.Math.Between(-20, H * 0.7);
      const v = Phaser.Math.Between(14, 24) * dir;
      for (let i = 0; i < n; i++) {
        const s = scene.add.image(x0 - dir * (i % 3) * 9 - dir * Math.random() * 6, y0 + (i - n / 2) * 5 + Math.random() * 3, 'bl-fish')
          .setDepth(D + 1).setAlpha(0.42).setFlipX(dir < 0);
        if (first) s.x += dir * Phaser.Math.Between(40, 200);
        fish.push({ s, v, ph: Math.random() * 6 });
      }
    };
    school(true); school(true);
    // Cáusticas: dos redes de luz que se mueven en direcciones distintas (efecto de agua viva)
    const caus = [0, 1].map(i => scene.add.tileSprite(B, 0, W - 2 * B, H, 'bl-caustics').setOrigin(0).setDepth(D + 2)
      .setBlendMode(Phaser.BlendModes.ADD).setAlpha(i ? 0.1 : 0.16).setTileScale(i ? 1.5 : 1, i ? 1.5 : 1));
    // Espuma de la orilla: va y viene como las olas
    const foamL = scene.add.tileSprite(B - 2, 0, 22, H, 'bl-foam').setOrigin(0).setDepth(D + 3);
    const foamR = scene.add.tileSprite(W - B + 2, 0, 22, H, 'bl-foam').setOrigin(1, 0).setFlipX(true).setDepth(D + 3);
    const waveL = scene.add.tileSprite(B - 2, 0, 22, H, 'bl-foam').setOrigin(0).setDepth(D + 3).setAlpha(0.6);
    const waveR = scene.add.tileSprite(W - B + 2, 0, 22, H, 'bl-foam').setOrigin(1, 0).setFlipX(true).setDepth(D + 3).setAlpha(0.6);
    // cada lengua de espuma desfasada para que no se vean iguales
    foamR.tilePositionY = 50; waveL.tilePositionY = 31; waveR.tilePositionY = 71;
    let t = 0, glintAcc = 0, fishAcc = 0;
    return {
      bg,
      update(dtMs, scroll) {
        t += dtMs / 1000;
        bg.tilePositionY -= scroll;
        caus[0].tilePositionY -= scroll + dtMs * 0.004; caus[0].tilePositionX += dtMs * 0.006;
        caus[1].tilePositionY -= scroll * 0.67 - dtMs * 0.003; caus[1].tilePositionX -= dtMs * 0.005;
        // olas: la espuma de la orilla respira y una segunda ola entra y se retira
        const w1 = Math.sin(t * 1.6), w2 = (t * 0.45) % 1;
        foamL.x = B - 3 + w1 * 1.5; foamR.x = W - B + 3 - w1 * 1.5;
        waveL.x = B + 1 + w2 * 9; waveR.x = W - B - 1 - w2 * 9;
        waveL.alpha = waveR.alpha = 0.7 * Math.sin(w2 * Math.PI);
        [foamL, foamR].forEach(f => { f.tilePositionY -= scroll; });
        [waveL, waveR].forEach(f => { f.tilePositionY -= scroll; });
        // destellos del sol sobre el agua
        glintAcc += dtMs;
        if (glintAcc > 140) {
          glintAcc = 0;
          const g = scene.add.image(Phaser.Math.Between(B + 8, W - B - 8), Phaser.Math.Between(0, H), 'bl-glint').setDepth(D + 4).setAlpha(0);
          scene.tweens.add({ targets: g, alpha: 0.75, duration: 260, yoyo: true, hold: 120, onComplete: () => g.destroy() });
        }
        // peces de decorado
        for (let i = fish.length - 1; i >= 0; i--) {
          const f = fish[i];
          f.ph += dtMs / 1000;
          f.s.x += f.v * dtMs / 1000; f.s.y += scroll * 0.5 + Math.sin(f.ph * 3) * 0.08;
          if (f.s.x < B - 40 || f.s.x > W - B + 40 || f.s.y > H + 20) { f.s.destroy(); fish.splice(i, 1); }
        }
        fishAcc += dtMs;
        if (fishAcc > 5200 && fish.length < 14) { fishAcc = 0; school(false); }
      },
      resize() {
        H = scene.scale.height;
        [bg, ...caus, foamL, foamR, waveL, waveR].forEach(o => o.setSize(o.width, H));
      },
    };
  };

  /** Fondo de portada y final: el mismo mar animado (avanza despacio) y una capa oscura. */
  MG.drawBackdrop = (scene, dim = 0.35) => {
    const { width: W, height: H } = scene.scale;
    const sea = MG.makeSea(scene, -10);
    const f = (time, dt) => sea.update(dt, dt * 0.012);
    scene.events.on('update', f);
    scene.events.once('shutdown', () => scene.events.off('update', f));
    if (dim) scene.add.rectangle(0, 0, W, H, 0x0d0a18, dim).setOrigin(0).setDepth(-5);
    return sea;
  };
})(window.AneGame);
