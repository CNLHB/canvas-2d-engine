/**
 *
 */
export default class Rect {
  ctx;
  x: number;
  y: number;
  height: number;
  width: number;
  constructor(x: number, y: number, height: number, width: number) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }
  setCtx(ctx) {
    this.ctx = ctx;
  }
  update() {}
  draw() {
    const ctx = this.ctx;
    ctx.fillRect(this.x, this.y, this.height, this.width);
  }
}
