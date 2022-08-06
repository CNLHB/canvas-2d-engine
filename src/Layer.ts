/**
 * @module zrender/Layer
 * @author pissang(https://www.github.com/pissang)
 */

import * as util from './utils/util';
import { devicePixelRatio } from './config';
//  import Style from './graphic/Style';

function returnFalse() {
  return false;
}

/**
 * 创建dom
 *
 * @inner
 * @param {string} id dom id 待用
 * @param {Painter} painter painter instance
 * @param {number} number
 */
function createDom(id, painter, dpr) {
  var newDom = util.createCanvas();
  var width = painter.getWidth();
  var height = painter.getHeight();

  var newDomStyle = newDom.style;
  if (newDomStyle) {
    // In node or some other non-browser environment
    newDomStyle.position = 'absolute';
    newDomStyle.left = 0;
    newDomStyle.top = 0;
    newDomStyle.width = width + 'px';
    newDomStyle.height = height + 'px';

    newDom.setAttribute('data-zr-dom-id', id);
  }

  newDom.width = width * dpr;
  newDom.height = height * dpr;

  return newDom;
}
interface ILayer {
  id: any;
  dom: any;
  domBack: any;
  ctxBack: any;
  painter: any;
  config: any;
  clearColor: any;
  motionBlur: any;
  lastFrameAlpha: any;
  dpr: any;
}
/**
 * @alias Layer
 * @constructor
 * @param {string} id
 * @param {Painter} painter
 * @param {number} [dpr]
 */
class Layer {
  __dirty = true;
  __used = false;
  ctx;
  id;
  dom;
  domBack;
  ctxBack;
  painter;
  config;
  clearColor;
  motionBlur;
  lastFrameAlpha;
  dpr;
  __builtin__;
  zlevel;
  constructor(id, painter, dpr) {
    console.log(id, 'id');

    var dom;
    dpr = dpr || devicePixelRatio;
    if (typeof id === 'string') {
      dom = createDom(id, painter, dpr);
    }
    // Not using isDom because in node it will return false
    else if (util.isObject(id)) {
      dom = id;
      id = dom.id;
    }
    this.id = id;
    this.dom = dom;

    var domStyle = dom.style;
    if (domStyle) {
      // Not in node
      dom.onselectstart = returnFalse; // 避免页面选中的尴尬
      domStyle['-webkit-user-select'] = 'none';
      domStyle['user-select'] = 'none';
      domStyle['-webkit-touch-callout'] = 'none';
      domStyle['-webkit-tap-highlight-color'] = 'rgba(0,0,0,0)';
      domStyle['padding'] = 0; // eslint-disable-line dot-notation
      domStyle['margin'] = 0; // eslint-disable-line dot-notation
      domStyle['border-width'] = 0;
    }

    this.domBack = null;
    this.ctxBack = null;

    this.painter = painter;

    this.config = null;

    // Configs
    /**
     * 每次清空画布的颜色
     * @type {string}
     * @default 0
     */
    this.clearColor = 0;
    /**
     * 是否开启动态模糊
     * @type {boolean}
     * @default false
     */
    this.motionBlur = false;
    /**
     * 在开启动态模糊的时候使用，与上一帧混合的alpha值，值越大尾迹越明显
     * @type {number}
     * @default 0.7
     */
    this.lastFrameAlpha = 0.7;

    /**
     * Layer dpr
     * @type {number}
     */
    this.dpr = dpr;
  }
  __drawIndex: 0;
  __startIndex: 0;
  __endIndex: 0;

  incremental: false;

  getElementCount() {
    return this.__endIndex - this.__startIndex;
  }

  initContext() {
    this.ctx = this.dom.getContext('2d');
    this.ctx.dpr = this.dpr;
  }

  createBackBuffer() {
    var dpr = this.dpr;

    this.domBack = createDom('back-' + this.id, this.painter, dpr);
    this.ctxBack = this.domBack.getContext('2d');

    if (dpr !== 1) {
      this.ctxBack.scale(dpr, dpr);
    }
  }

  /**
   * @param  {number} width
   * @param  {number} height
   */
  resize(width, height) {
    var dpr = this.dpr;

    var dom = this.dom;
    var domStyle = dom.style;
    var domBack = this.domBack;

    if (domStyle) {
      domStyle.width = width + 'px';
      domStyle.height = height + 'px';
    }

    dom.width = width * dpr;
    dom.height = height * dpr;

    if (domBack) {
      domBack.width = width * dpr;
      domBack.height = height * dpr;

      if (dpr !== 1) {
        this.ctxBack.scale(dpr, dpr);
      }
    }
  }

  /**
   * 清空该层画布
   * @param {boolean} [clearAll]=false Clear all with out motion blur
   * @param {Color} [clearColor]
   */
  clear(clearAll, clearColor) {
    var dom = this.dom;
    var ctx = this.ctx;
    var width = dom.width;
    var height = dom.height;

    var clearColor = clearColor || this.clearColor;
    var haveMotionBLur = this.motionBlur && !clearAll;
    var lastFrameAlpha = this.lastFrameAlpha;

    var dpr = this.dpr;

    if (haveMotionBLur) {
      if (!this.domBack) {
        this.createBackBuffer();
      }

      this.ctxBack.globalCompositeOperation = 'copy';
      this.ctxBack.drawImage(dom, 0, 0, width / dpr, height / dpr);
    }

    ctx.clearRect(0, 0, width, height);
    if (clearColor && clearColor !== 'transparent') {
      var clearColorGradientOrPattern;
      // Gradient
      if (clearColor.colorStops) {
        // Cache canvas gradient
        clearColorGradientOrPattern = clearColor.__canvasGradient;
        //   || Style.getGradient(ctx, clearColor, {
        //      x: 0,
        //      y: 0,
        //      width: width,
        //      height: height
        //  });

        clearColor.__canvasGradient = clearColorGradientOrPattern;
      }
      // Pattern
      else if (clearColor.image) {
        //  clearColorGradientOrPattern = Pattern.prototype.getCanvasPattern.call(clearColor, ctx);
      }
      ctx.save();
      ctx.fillStyle = clearColorGradientOrPattern || clearColor;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    if (haveMotionBLur) {
      var domBack = this.domBack;
      ctx.save();
      ctx.globalAlpha = lastFrameAlpha;
      ctx.drawImage(domBack, 0, 0, width, height);
      ctx.restore();
    }
  }
}

export default Layer;
