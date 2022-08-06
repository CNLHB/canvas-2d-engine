import * as curve from './curve';
import * as vec2 from './vector';
import * as bbox from './bbox';
import BoundingRect from './BoundingRect';
import { devicePixelRatio as dpr } from '../config';

var min: Array<any> = [];
var max: Array<any> = [];
var min2: Array<any> = [];
var max2: Array<any> = [];
var mathMin = Math.min;
var mathMax = Math.max;
var mathCos = Math.cos;
var mathSin = Math.sin;
var mathSqrt = Math.sqrt;
var mathAbs = Math.abs;
var hasTypedArray = typeof Float32Array !== 'undefined';
var CMD = {
  M: 1,
  L: 2,
  C: 3,
  Q: 4,
  A: 5,
  Z: 6,
  // Rect
  R: 7,
};
export default class PathProxy {
  _saveData;
  data;
  _ctx;
  _xi = 0;
  _yi = 0;
  dpr;
  _x0: 0;
  _y0: 0;
  // Unit x, Unit y. Provide for avoiding drawing that too short line segment
  _ux = 0;
  _uy = 0;

  _len = 0;

  _lineDash: null;

  _dashOffset = 0;

  _dashIdx = 0;

  _dashSum = 0;
  _prevCmd;
  static CMD = CMD;
  constructor(notSaveData?) {
    this._saveData = !(notSaveData || false);

    if (this._saveData) {
      /**
       * Path data. Stored as flat array
       * @type {Array.<Object>}
       */
      this.data = [];
    }

    this._ctx = null;
  }
  /**
   * @readOnly
   */
  setScale(sx, sy, segmentIgnoreThreshold) {
    // Compat. Previously there is no segmentIgnoreThreshold.
    segmentIgnoreThreshold = segmentIgnoreThreshold || 0;
    this._ux = mathAbs(segmentIgnoreThreshold / dpr / sx) || 0;
    this._uy = mathAbs(segmentIgnoreThreshold / dpr / sy) || 0;
  }

  getContext() {
    return this._ctx;
  }
  /**
   * @param  {CanvasRenderingContext2D} ctx
   * @return {PathProxy}
   */
  beginPath(ctx?) {
    this._ctx = ctx;

    ctx && ctx.beginPath();

    ctx && (this.dpr = ctx.dpr);

    // Reset
    if (this._saveData) {
      this._len = 0;
    }

    if (this._lineDash) {
      this._lineDash = null;

      this._dashOffset = 0;
    }

    return this;
  }
  /**
   * @return {module:zrender/core/BoundingRect}
   */
  getBoundingRect() {
    min[0] = min[1] = min2[0] = min2[1] = Number.MAX_VALUE;
    max[0] = max[1] = max2[0] = max2[1] = -Number.MAX_VALUE;

    var data = this.data;
    var xi = 0;
    var yi = 0;
    var x0 = 0;
    var y0 = 0;

    for (var i = 0; i < data.length; ) {
      var cmd = data[i++];

      if (i === 1) {
        // 如果第一个命令是 L, C, Q
        // 则 previous point 同绘制命令的第一个 point
        //
        // 第一个命令为 Arc 的情况下会在后面特殊处理
        xi = data[i];
        yi = data[i + 1];

        x0 = xi;
        y0 = yi;
      }

      switch (cmd) {
        case CMD.M:
          // moveTo 命令重新创建一个新的 subpath, 并且更新新的起点
          // 在 closePath 的时候使用
          x0 = data[i++];
          y0 = data[i++];
          xi = x0;
          yi = y0;
          min2[0] = x0;
          min2[1] = y0;
          max2[0] = x0;
          max2[1] = y0;
          break;
        case CMD.L:
          bbox.fromLine(xi, yi, data[i], data[i + 1], min2, max2);
          xi = data[i++];
          yi = data[i++];
          break;
        case CMD.C:
          bbox.fromCubic(
            xi,
            yi,
            data[i++],
            data[i++],
            data[i++],
            data[i++],
            data[i],
            data[i + 1],
            min2,
            max2
          );
          xi = data[i++];
          yi = data[i++];
          break;
        case CMD.Q:
          bbox.fromQuadratic(
            xi,
            yi,
            data[i++],
            data[i++],
            data[i],
            data[i + 1],
            min2,
            max2
          );
          xi = data[i++];
          yi = data[i++];
          break;
        case CMD.A:
          // TODO Arc 判断的开销比较大
          var cx = data[i++];
          var cy = data[i++];
          var rx = data[i++];
          var ry = data[i++];
          var startAngle = data[i++];
          var endAngle = data[i++] + startAngle;
          // TODO Arc 旋转
          i += 1;
          var anticlockwise = 1 - data[i++];

          if (i === 1) {
            // 直接使用 arc 命令
            // 第一个命令起点还未定义
            x0 = mathCos(startAngle) * rx + cx;
            y0 = mathSin(startAngle) * ry + cy;
          }

          bbox.fromArc(
            cx,
            cy,
            rx,
            ry,
            startAngle,
            endAngle,
            anticlockwise,
            min2,
            max2
          );

          xi = mathCos(endAngle) * rx + cx;
          yi = mathSin(endAngle) * ry + cy;
          break;
        case CMD.R:
          x0 = xi = data[i++];
          y0 = yi = data[i++];
          var width = data[i++];
          var height = data[i++];
          // Use fromLine
          bbox.fromLine(x0, y0, x0 + width, y0 + height, min2, max2);
          break;
        case CMD.Z:
          xi = x0;
          yi = y0;
          break;
      }

      // Union
      vec2.min(min, min, min2);
      vec2.max(max, max, max2);
    }

    // No data
    if (i === 0) {
      min[0] = min[1] = max[0] = max[1] = 0;
    }

    return new BoundingRect(min[0], min[1], max[0] - min[0], max[1] - min[1]);
  }
  /**
   * 填充 Path 数据。
   * 尽量复用而不申明新的数组。大部分图形重绘的指令数据长度都是不变的。
   */
  addData(cmd, ...rest) {
    if (!this._saveData) {
      return;
    }

    var data = this.data;
    if (this._len + arguments.length > data.length) {
      // 因为之前的数组已经转换成静态的 Float32Array
      // 所以不够用时需要扩展一个新的动态数组
      this._expandData();
      data = this.data;
    }
    for (var i = 0; i < arguments.length; i++) {
      data[this._len++] = arguments[i];
    }

    this._prevCmd = cmd;
  }
  _expandData() {
    // Only if data is Float32Array
    if (!(this.data instanceof Array)) {
      var newData: Array<any> = [];
      for (var i = 0; i < this._len; i++) {
        newData[i] = this.data[i];
      }
      this.data = newData;
    }
  }
  /**
   * @param  {number} cx
   * @param  {number} cy
   * @param  {number} r
   * @param  {number} startAngle
   * @param  {number} endAngle
   * @param  {boolean} anticlockwise
   * @return {module:zrender/core/PathProxy}
   */
  arc(cx, cy, r, startAngle, endAngle, anticlockwise) {
    this.addData(
      CMD.A,
      cx,
      cy,
      r,
      r,
      startAngle,
      endAngle - startAngle,
      0,
      anticlockwise ? 0 : 1
    );
    this._ctx && this._ctx.arc(cx, cy, r, startAngle, endAngle, anticlockwise);
    this._xi = mathCos(endAngle) * r + cx;
    this._yi = mathSin(endAngle) * r + cy;
    return this;
  }
}
