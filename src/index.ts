import { ICanvasEngine } from './core/interface/index';
import Storage from './Storage';
import { Rect, Line, Circle } from './graphic/shape/index';
import * as zrUtil from './utils/util';
import guid from './core/guid';
import env from './core/env';

import Painter from './Painter';
import Handler from './Handler';
import HandlerProxy from './dom/HandlerProxy';
import Animation from './animation/Animation';
export { Rect, Line, Circle };
var painterCtors = {
  canvas: Painter,
};

var instances = {}; // ZRender实例map索引
export function init(dom, opts) {
  var zr = new CanvasEngine(guid(), dom, opts);
  instances[zr.id] = zr;
  return zr;
}
export function getInstance(id) {
  return instances[id];
}

export function registerPainter(name, Ctor) {
  painterCtors[name] = Ctor;
}
function delInstance(id) {
  delete instances[id];
}
/**
 *
 */
export default class CanvasEngine {
  private canvas: HTMLCanvasElement;
  dom: HTMLElement;
  storage: Storage;
  painter: Painter;
  handler: Handler;
  animation: Animation;
  _needsRefresh = false;
  _needsRefreshHover = false;
  id;
  static init(dom, opts) {
    return init(dom, opts);
  }
  constructor(id, dom, opts) {
    this.id = id;
    this.dom = dom;
    this.canvas = zrUtil.createCanvas();
    dom.appendChild(this.canvas);
    if (!this.canvas) {
      console.error('CanvasEngine Error');
      return;
    }
    var rendererType = opts.renderer;
    // TODO WebGL
    if (!rendererType || !painterCtors[rendererType]) {
      rendererType = 'canvas';
    }
    const storage = new Storage();
    this.storage = storage;
    var painter = new painterCtors[rendererType](dom, this.storage, opts, id);
    // const s = new Painter()
    this.painter = painter;
    var handedProxy =
      !env.node && !env.worker
        ? new HandlerProxy(painter.getViewportRoot(), painter.root)
        : null;
    this.handler = new Handler(
      this.storage,
      painter,
      handedProxy,
      painter.root
    );

    // this.handler = new Handler(this.storage, this.painter, null, this.dom);
    this.animation = new Animation({
      stage: {
        update: zrUtil.bind(this.flush, this),
      },
    });
    this.animation.start();
    // 修改 storage.delFromStorage, 每次删除元素之前删除动画
    // FIXME 有点ugly
    var oldDelFromStorage = storage.delFromStorage;
    var oldAddToStorage = storage.addToStorage;
    const self = this;
    storage.delFromStorage = function (el) {
      oldDelFromStorage.call(storage, el);
      el && el.removeSelfFromZr(self);
    };
    storage.addToStorage = function (el) {
      oldAddToStorage.call(storage, el);
      el.addSelfToZr(self);
    };
  }
  /**
   * 获取实例唯一标识
   * @return {string}
   */
  getId() {
    return this.id;
  }
  /**
   * 添加元素
   * @param  {Element} el
   */
  add(el: any) {
    this.storage.addRoot(el);
    this._needsRefresh = true;
  }
  /**
   * 删除元素
   * @param  {Element} el
   */
  remove(el) {
    this.storage.delRoot(el);
    this._needsRefresh = true;
  }
  /**
   * Change configuration of layer
   * @param {string} zLevel
   * @param {Object} config
   * @param {string} [config.clearColor=0] Clear color
   * @param {string} [config.motionBlur=false] If enable motion blur
   * @param {number} [config.lastFrameAlpha=0.7] Motion blur factor. Larger value cause longer trailer
   */
  configLayer(zLevel, config) {
    if (this.painter.configLayer) {
      this.painter.configLayer(zLevel, config);
    }
    this._needsRefresh = true;
  }

  /**
   * Set background color
   * @param {string} backgroundColor
   */
  setBackgroundColor(backgroundColor) {
    if (this.painter.setBackgroundColor) {
      this.painter.setBackgroundColor(backgroundColor);
    }
    this._needsRefresh = true;
  }

  /**
   * Repaint the canvas immediately
   */
  refreshImmediately() {
    // var start = new Date();

    // Clear needsRefresh ahead to avoid something wrong happens in refresh
    // Or it will cause zrender refreshes again and again.
    this._needsRefresh = this._needsRefreshHover = false;
    this.painter.refresh();
    // Avoid trigger zr.refresh in Element#beforeUpdate hook
    this._needsRefresh = this._needsRefreshHover = false;

    // var end = new Date();
    // var log = document.getElementById('log');
    // if (log) {
    //     log.innerHTML = log.innerHTML + '<br>' + (end - start);
    // }
  }

  /**
   * Mark and repaint the canvas in the next frame of browser
   */
  refresh() {
    // console.log('refresh');

    this._needsRefresh = true;
  }

  /**
   * Perform all refresh
   */
  flush() {
    var triggerRendered;

    if (this._needsRefresh) {
      triggerRendered = true;
      this.refreshImmediately();
    }
    if (this._needsRefreshHover) {
      triggerRendered = true;
      this.refreshHoverImmediately();
    }

    triggerRendered && this.trigger('rendered');
  }
  /**
   * Add element to hover layer
   * @param  {module:zrender/Element} el
   * @param {Object} style
   */
  addHover(el, style) {
    if (this.painter.addHover) {
      var elMirror = this.painter.addHover(el, style);
      this.refreshHover();
      return elMirror;
    }
  }

  /**
   * Add element from hover layer
   * @param  {module:zrender/Element} el
   */
  removeHover(el) {
    if (this.painter.removeHover) {
      this.painter.removeHover(el);
      this.refreshHover();
    }
  }

  /**
   * Clear all hover elements in hover layer
   * @param  {module:zrender/Element} el
   */
  clearHover() {
    if (this.painter.clearHover) {
      this.painter.clearHover();
      this.refreshHover();
    }
  }

  /**
   * Refresh hover in next frame
   */
  refreshHover() {
    this._needsRefreshHover = true;
  }

  /**
   * Refresh hover immediately
   */
  refreshHoverImmediately() {
    this._needsRefreshHover = false;
    this.painter.refreshHover && this.painter.refreshHover();
  }

  /**
   * Resize the canvas.
   * Should be invoked when container size is changed
   * @param {Object} [opts]
   * @param {number|string} [opts.width] Can be 'auto' (the same as null/undefined)
   * @param {number|string} [opts.height] Can be 'auto' (the same as null/undefined)
   */
  resize(opts) {
    opts = opts || {};
    this.painter.resize(opts.width, opts.height);
    this.handler.resize();
  }

  /**
   * Stop and clear all animation immediately
   */
  clearAnimation() {
    // this.animation.clear();
  }

  /**
   * Get container width
   */
  getWidth() {
    return this.painter.getWidth();
  }

  /**
   * Get container height
   */
  getHeight() {
    return this.painter.getHeight();
  }

  /**
   * Export the canvas as Base64 URL
   * @param {string} type
   * @param {string} [backgroundColor='#fff']
   * @return {string} Base64 URL
   */
  // toDataURL: function(type, backgroundColor) {
  //     return this.painter.getRenderedCanvas({
  //         backgroundColor: backgroundColor
  //     }).toDataURL(type);
  // },

  /**
   * Converting a path to image.
   * It has much better performance of drawing image rather than drawing a vector path.
   * @param {module:zrender/graphic/Path} e
   * @param {number} width
   * @param {number} height
   */
  pathToImage(e, dpr) {
    return this.painter.pathToImage(e, dpr);
  }

  /**
   * Set default cursor
   * @param {string} [cursorStyle='default'] 例如 crosshair
   */
  setCursorStyle(cursorStyle) {
    this.handler.setCursorStyle(cursorStyle);
  }

  /**
   * Find hovered element
   * @param {number} x
   * @param {number} y
   * @return {Object} {target, topTarget}
   */
  findHover(x, y) {
    return this.handler.findHover(x, y);
  }
  /**
   * Bind event
   *
   * @param {string} eventName Event name
   * @param {Function} eventHandler Handler function
   * @param {Object} [context] Context object
   */
  on(eventName, eventHandler, context) {
    this.handler.on(eventName, eventHandler, context);
  }

  /**
   * Unbind event
   * @param {string} eventName Event name
   * @param {Function} [eventHandler] Handler function
   */
  off(eventName, eventHandler) {
    this.handler.off(eventName, eventHandler);
  }

  /**
   * Trigger event manually
   *
   * @param {string} eventName Event name
   * @param {event=} event Event object
   */
  trigger(eventName, event?) {
    this.handler.trigger(eventName, event);
  }

  /**
   * Clear all objects and the canvas.
   */
  clear() {
    this.storage.delRoot();
    this.painter.clear();
  }

  /**
   * Dispose self.
   */
  dispose() {
    // this.animation.stop();

    this.clear();
    this.storage.dispose();
    this.painter.dispose();
    this.handler.dispose();

    // this.storage = this.painter = this.handler = null;

    delInstance(this.id);
  }
  // drawRect(params) {
  //   const { x, y, width, height, type, color } = params;
  //   const rect = new Rect(x, y, width, height, type, color);
  //   rect.setCtx(this.ctx);
  //   rect.draw();
  //   this.nodes.push(rect);
  // }
  // drawLine(params) {
  //   const { points, type, close } = params;
  //   const line = new Line(points, type, close);
  //   line.setCtx(this.ctx);
  //   line.draw();
  //   this.nodes.push(line);
  // }
  // drawCircle(x, y, radius) {
  //   this.ctx.beginPath();
  //   this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
  //   // this.ctx.fill();
  //   this.ctx.stroke();
  // }
  // drawArc(x, y, radius, startAngle, endAngle, anticlockwise = true) {
  //   this.ctx.beginPath();
  //   this.ctx.arc(x, y, radius, startAngle, endAngle, anticlockwise);
  //   // this.ctx.fill();
  //   this.ctx.stroke();
  // }
  // clear() {
  //   this.nodes.forEach((node) => {
  //     node.clear();
  //   });
  // }
}
