export default class Base {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  setCtx(ctx) {
    this.ctx = ctx;
  }
  update() {}
  draw() {}
}
