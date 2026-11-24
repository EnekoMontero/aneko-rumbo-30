/* Carga todos los recursos compartidos y genera texturas sencillas (corazones). */
(function (G) {
  class BootScene extends Phaser.Scene {
    constructor() { super('Boot'); }

    preload() {
      // Barra de progreso en la pantalla HTML de carga (#loading)
      const bar = document.getElementById('loading-bar'), pct = document.getElementById('loading-pct');
      this.load.on('progress', (v) => {
        if (bar) bar.style.width = Math.round(v * 100) + '%';
        if (pct) pct.textContent = Math.round(v * 100) + '%';
      });
      this.load.image('bg-zamora', G.asset('assets/bg/zamora.jpg'));
      ['idle', 'run', 'eat', 'spicy', 'celebrate', 'jump', 'stand', 'run1', 'run2', 'rjump', 'tired', 'drink', 'runc1', 'runc2', 'runc3', 'runc4']
        .forEach(p => this.load.image('ane-' + p, G.asset(`assets/ane/ane_${p}.png`)));
      Object.values(G.minigames).forEach(mg => mg.preload && mg.preload(this));
      (G.corePreload || []).forEach(fn => fn(this));
    }

    create() {
      this.makeHeart('heart', [0xff3b5c, 0xffffff]);
      this.makeHeart('heart-empty', [0x4a3c66, 0x6d5a91]);
      this.makePadlock();
      document.getElementById('loading').style.display = 'none';
      // Antes del día 1: cuenta atrás (ni intro ni mapa). Después: intro la primera vez, luego el mapa.
      this.scene.start(G.firstScene || (G.unlock.beforeStart() ? 'Countdown'
        : G.story && G.story.shouldShowIntro() ? 'Intro' : 'Map'));
    }

    /** Candado pixel-art 12x14 para nodos bloqueados. */
    makePadlock() {
      const P = [
        '...XXXXXX...', '..XggggggX..', '.XgXXXXXXgX.', '.XgX....XgX.', '.XgX....XgX.',
        'XXXXXXXXXXXX', 'XyyyyyyyyywX', 'XyyyyXXyyywX', 'XyyyyXXyyywX', 'XyyyyyXyyywX',
        'XyyyyyXyyywX', 'XyyyyyyyyywX', 'XooooooooooX', 'XXXXXXXXXXXX',
      ];
      const C = { X: 0x1b1430, g: 0xb8b8c8, y: 0xffc83d, w: 0xfff2a8, o: 0xd08a1e };
      const g = this.make.graphics({ add: false });
      P.forEach((row, y) => [...row].forEach((ch, x) => {
        if (ch === '.') return; g.fillStyle(C[ch] ?? C.o, 1).fillRect(x, y, 1, 1);
      }));
      g.generateTexture('padlock', 12, 14); g.destroy();
    }

    /** Corazón pixel-art de 11x10 px dibujado a mano. */
    makeHeart(key, [fill, shine]) {
      const P = [
        '.XXX...XXX.',
        'XffsX.XfffX',
        'XfsffXffffX',
        'XfffffffffX',
        'XfffffffffX',
        '.XfffffffX.',
        '..XfffffX..',
        '...XfffX...',
        '....XfX....',
        '.....X.....',
      ];
      const g = this.make.graphics({ add: false });
      P.forEach((row, y) => [...row].forEach((ch, x) => {
        if (ch === '.') return;
        g.fillStyle(ch === 'X' ? 0x1b1430 : ch === 's' ? shine : fill, 1).fillRect(x, y, 1, 1);
      }));
      g.generateTexture(key, 11, 10); g.destroy();
    }
  }
  G.BootScene = BootScene;
})(window.AneGame);
