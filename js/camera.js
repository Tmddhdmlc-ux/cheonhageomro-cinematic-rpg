(function (W) {
  "use strict";
  const U = W.util;

  class Camera {
    constructor() { this.reset(true); }
    reset(immediate) {
      this.targetX = 640; this.targetY = 310; this.targetZoom = 1;
      this.followTarget = null; this.shakeTime = 0; this.shakePower = 0;
      if (immediate) { this.x = 640; this.y = 310; this.zoom = 1; }
    }
    pan(x, y, zoom) { this.targetX = x; this.targetY = y; if (zoom != null) this.targetZoom = zoom; }
    follow(target, zoom) { this.followTarget = target; if (zoom != null) this.targetZoom = zoom; }
    release() { this.followTarget = null; }
    shake(power, duration) { this.shakePower = Math.max(this.shakePower, power); this.shakeTime = Math.max(this.shakeTime, duration); }
    punch(direction=1, power=18) { this.x-=direction*power; this.shake(power*.35,.1); }
    focusBetween(a,b,zoom=1.2) { this.release(); this.pan((a.x+b.x)/2,(a.y+b.y)/2-95,zoom); }
    slowPush(x,y,zoom=1.15) { this.release(); this.targetX=x; this.targetY=y; this.targetZoom=zoom; }
    update(dt) {
      if (this.followTarget) { this.targetX = this.followTarget.x; this.targetY = this.followTarget.y - 95; }
      const k = 1 - Math.pow(.0005, dt);
      this.x = U.lerp(this.x, this.targetX, k);
      this.y = U.lerp(this.y, this.targetY, k);
      this.zoom = U.lerp(this.zoom, this.targetZoom, k);
      if (this.shakeTime > 0) this.shakeTime -= dt;
      else this.shakePower = U.lerp(this.shakePower, 0, k);
    }
    apply(ctx) {
      const falloff = this.shakeTime > 0 ? Math.min(1, this.shakeTime * 7) : 0;
      const sx = (Math.random() - .5) * this.shakePower * falloff;
      const sy = (Math.random() - .5) * this.shakePower * falloff;
      ctx.translate(640 + sx, 310 + sy);
      ctx.scale(this.zoom, this.zoom);
      ctx.translate(-this.x, -this.y);
    }
  }

  W.Camera = Camera;
})(window.Wuxia);
