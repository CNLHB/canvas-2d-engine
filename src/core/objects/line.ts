import { LineType } from '../enum';

interface IPoint {
  x: number;
  y: number;
  type: string;
}
/**
 *
 */
export default class Line {
  ctx: CanvasRenderingContext2D;
  points: Array<IPoint>;
  type: LineType;
  close: Boolean = false;
  constructor(points, type: LineType = 'fill', close: boolean = false) {
    this.points = points;
    this.type = type;
    this.close = close;
  }
  setCtx(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }
  update() {}
  draw() {
    const ctx = this.ctx;
    ctx.beginPath();
    this.points.forEach((point, index) => {
      // 自定义画笔
      if (point.type) {
        return;
      }
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    if (this.close && this.points.length > 1) {
      ctx.lineTo(this.points[0].x, this.points[0].y);
    }
    ctx[this.type]();
  }
  clear() {
    const ctx = this.ctx;
  }
}
