import { ICanvasEngine } from './core/interface/index';
import { Rect, Line } from './core/objects/index';
export { Rect, Line } from './core/objects/index';

/**
 *
 */
export default class CanvasEngine {
  private canvas: HTMLCanvasElement;
  private nodes: Array<any>;
  ctx: CanvasRenderingContext2D;
  constructor(options) {
    this.canvas = options.el;
    if (!this.canvas) {
      console.error('CanvasEngine Error');
      return;
    }
    this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
    this.nodes = [];
  }
  add(node: Rect) {
    this.nodes.push(node);
  }
  drawRect(params) {
    const { x, y, width, height, type, color } = params;
    const rect = new Rect(x, y, width, height, type, color);
    rect.setCtx(this.ctx);
    rect.draw();
    this.nodes.push(rect);
  }
  drawLine(params) {
    const { points, type, close } = params;
    const line = new Line(points, type, close);
    line.setCtx(this.ctx);
    line.draw();
    this.nodes.push(line);
  }
  drawCircle() {}
  clear() {
    this.nodes.forEach((node) => {
      node.clear();
    });
  }
}
