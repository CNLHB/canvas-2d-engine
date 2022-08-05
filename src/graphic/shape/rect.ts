import { RectType } from '../enum';
import Base from './base';
/**
 *
 */
export default class Rect extends Base {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  height: number;
  width: number;
  type: RectType;
  color?: string;
  constructor(
    x: number,
    y: number,
    height: number,
    width: number,
    type: RectType = 'fill',
    color?: string
  ) {
    super();
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.type = type;
    this.color = color;
  }
  setCtx(ctx) {
    this.ctx = ctx;
  }
  update() {}
  draw() {
    const ctx = this.ctx;
    if (this.color) {
      ctx.fillStyle = this.color;
    }
    ctx[`${this.type}Rect`](this.x, this.y, this.height, this.width);
  }
  clear() {
    const ctx = this.ctx;
    ctx.clearRect(this.x, this.y, this.height, this.width);
  }
}
