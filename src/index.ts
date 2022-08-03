import { ICanvasEngine } from './core/interface/index';
import { Rect, Line } from './core/objects/index';
import { addEventListenerByDom } from './event';
export { Rect, Line };
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
    addEventListenerByDom(this.canvas);
    this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
    this.ctx.setTransform(0.5, 0, 0, 0.5, 0, 0);
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
  drawCircle(x, y, radius) {
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
    // this.ctx.fill();
    this.ctx.stroke();
  }
  drawArc(x, y, radius, startAngle, endAngle, anticlockwise = true) {
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, startAngle, endAngle, anticlockwise);
    // this.ctx.fill();
    this.ctx.stroke();
  }
  clear() {
    this.nodes.forEach((node) => {
      node.clear();
    });
  }
}
