import { ICanvasEngine } from './core/interface/index';
import { Rect } from './core/objects/index';
export { Rect } from './core/objects/index';

/**
 *
 */
export default class CanvasEngine {
  private canvas: HTMLCanvasElement;
  private list: Array<any>;
  ctx;
  constructor(options) {
    this.canvas = options.el;
    this.ctx = this.canvas.getContext('2d');
    this.list = [];
  }
  add(node: Rect) {
    node.setCtx(this.ctx);
    node.draw();
    this.list.push(node);
  }
}
