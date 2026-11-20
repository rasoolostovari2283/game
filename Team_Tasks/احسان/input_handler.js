/**
 * ماژول مدیریت ورودی‌های صفحه‌کلید نسخه دسکتاپ (Keyboard Input Handler V2.5)
 * توسعه‌دهنده: احسان کاظمی (مهندس فیزیک و استقرار دسکتاپ)
 * پروژه: Neon Highway - اسپرینت ۲
 */

class InputHandler {
  constructor(physicsEngine, gameEngine = null) {
    this.physics = physicsEngine;
    this.game = gameEngine;

    // نگاشت وضعیت کلیدها
    this.keys = {
      up: false,
      down: false,
      left: false,
      right: false,
      nitro: false,
      slowmo: false,
      hack: false,
      horn: false
    };

    // لیست کلیدهایی که نباید باعث اسکرول یا رفتار پیش‌فرض ویندوز شوند
    this.blockedKeys = new Set([
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      ' ', 'Space', 'Shift', 'ShiftLeft', 'ShiftRight',
      'Tab', 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyE', 'KeyC', 'KeyH', 'KeyP'
    ]);

    this.initEventListeners();
  }

  initEventListeners() {
    window.addEventListener('keydown', (e) => this.handleKeyDown(e), { passive: false });
    window.addEventListener('keyup', (e) => this.handleKeyUp(e), { passive: false });

    // ریست کلیدها هنگام از دست رفتن فوکوس پنجره (Alt+Tab)
    window.addEventListener('blur', () => this.resetKeys());
  }

  handleKeyDown(e) {
    const key = e.key;
    const code = e.code;

    if (this.blockedKeys.has(key) || this.blockedKeys.has(code)) {
      e.preventDefault();
    }

    // ۱. شتاب و پدال گاز (W یا جهت بالا)
    if (code === 'KeyW' || key === 'ArrowUp' || key.toLowerCase() === 'w') {
      this.keys.up = true;
      if (this.physics) this.physics.keys.up = true;
    }

    // ۲. ترمز و کاهش سرعت (S یا جهت پایین)
    if (code === 'KeyS' || key === 'ArrowDown' || key.toLowerCase() === 's') {
      this.keys.down = true;
      if (this.physics) this.physics.keys.down = true;
    }

    // ۳. فرمان چپ (A یا جهت چپ)
    if (code === 'KeyA' || key === 'ArrowLeft' || key.toLowerCase() === 'a') {
      this.keys.left = true;
      if (this.physics) this.physics.keys.left = true;
    }

    // ۴. فرمان راست (D یا جهت راست)
    if (code === 'KeyD' || key === 'ArrowRight' || key.toLowerCase() === 'd') {
      this.keys.right = true;
      if (this.physics) this.physics.keys.right = true;
    }

    // ۵. نیتروژن مایع (کلید SPACE)
    if (code === 'Space' || key === ' ') {
      this.keys.nitro = true;
      if (this.physics) this.physics.keys.nitro = true;
    }

    // ۶. اسلوموشن زمانی ماتریسی (کلید SHIFT)
    if (code === 'ShiftLeft' || code === 'ShiftRight' || key === 'Shift') {
      this.keys.slowmo = true;
      if (this.physics) this.physics.keys.slowmo = true;
      if (this.game && typeof this.game.setSlowMo === 'function') {
        this.game.setSlowMo(true);
      }
    }

    // ۷. هک مسیر و پالس الکترومغناطیسی (کلید E)
    if ((code === 'KeyE' || key.toLowerCase() === 'e') && !e.repeat) {
      this.keys.hack = true;
      if (this.game && typeof this.game.triggerCyberHack === 'function') {
        this.game.triggerCyberHack();
      }
    }

    // ۸. بوق زدن و تغییر لاین ترافیک جلویی (کلید H)
    if (code === 'KeyH' || key.toLowerCase() === 'h') {
      this.keys.horn = true;
      if (this.game && typeof this.game.triggerHorn === 'function') {
        this.game.triggerHorn();
      }
    }

    // ۹. تعویض زاویه دید دوربین (کلید C)
    if ((code === 'KeyC' || key.toLowerCase() === 'c') && !e.repeat) {
      if (this.game && typeof this.game.toggleCamera === 'function') {
        this.game.toggleCamera();
      }
    }

    // ۱۰. توقف موقت و منوی تنظیمات (کلید ESC یا P)
    if ((code === 'Escape' || code === 'KeyP' || key.toLowerCase() === 'p') && !e.repeat) {
      if (this.game && typeof this.game.togglePause === 'function') {
        this.game.togglePause();
      }
    }

    // ۱۱. قطع و وصل صدا و موسیقی (کلید M)
    if ((code === 'KeyM' || key.toLowerCase() === 'm') && !e.repeat) {
      if (window.soundSystem && typeof window.soundSystem.toggleSound === 'function') {
        window.soundSystem.toggleSound();
      }
    }
  }

  handleKeyUp(e) {
    const key = e.key;
    const code = e.code;

    if (code === 'KeyW' || key === 'ArrowUp' || key.toLowerCase() === 'w') {
      this.keys.up = false;
      if (this.physics) this.physics.keys.up = false;
    }

    if (code === 'KeyS' || key === 'ArrowDown' || key.toLowerCase() === 's') {
      this.keys.down = false;
      if (this.physics) this.physics.keys.down = false;
    }

    if (code === 'KeyA' || key === 'ArrowLeft' || key.toLowerCase() === 'a') {
      this.keys.left = false;
      if (this.physics) this.physics.keys.left = false;
    }

    if (code === 'KeyD' || key === 'ArrowRight' || key.toLowerCase() === 'd') {
      this.keys.right = false;
      if (this.physics) this.physics.keys.right = false;
    }

    if (code === 'Space' || key === ' ') {
      this.keys.nitro = false;
      if (this.physics) this.physics.keys.nitro = false;
    }

    if (code === 'ShiftLeft' || code === 'ShiftRight' || key === 'Shift') {
      this.keys.slowmo = false;
      if (this.physics) this.physics.keys.slowmo = false;
      if (this.game && typeof this.game.setSlowMo === 'function') {
        this.game.setSlowMo(false);
      }
    }

    if (code === 'KeyH' || key.toLowerCase() === 'h') {
      this.keys.horn = false;
    }
  }

  resetKeys() {
    for (const k in this.keys) {
      this.keys[k] = false;
    }
    if (this.physics && this.physics.keys) {
      for (const pk in this.physics.keys) {
        this.physics.keys[pk] = false;
      }
    }
  }
}

if (typeof module !== 'undefined') {
  module.exports = InputHandler;
}
