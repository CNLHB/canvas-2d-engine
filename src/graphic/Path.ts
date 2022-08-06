import Displayable from './Displayable';
import * as zrUtil from '../utils/util';
import PathProxy from '../core/PathProxy';
var abs = Math.abs;
import * as pathContain from '../contain/path';

export default class Path extends Displayable {
  path: PathProxy;
  type = 'path';
  shape;
  __dirtyPath = true;
  _rect;
  strokeContainThreshold = 5;
  segmentIgnoreThreshold: 0;
  _rectWithStroke;
  __dirty;

  /**
   * See `module:zrender/src/graphic/helper/subPixelOptimize`.
   * @type {boolean}
   */
  subPixelOptimize: false;
  constructor(opts) {
    super(opts);
    this.createPathProxy();
  }
  brush(ctx, prevEl) {
    var path = this.path;
    console.log('brush', this, ctx, path);
    this.path.beginPath(ctx);
    this.buildPath(path, this.shape, false);
  }
  getGlobalScale(out) {
    var m = this.transform;
    out = out || [];
    if (!m) {
      out[0] = 1;
      out[1] = 1;
      return out;
    }
    out[0] = Math.sqrt(m[0] * m[0] + m[1] * m[1]);
    out[1] = Math.sqrt(m[2] * m[2] + m[3] * m[3]);
    if (m[0] < 0) {
      out[0] = -out[0];
    }
    if (m[3] < 0) {
      out[1] = -out[1];
    }
    return out;
  }
  buildPath(ctx, shape, inBundle) {}
  /**
   * @param {Object|string} key
   * @param {*} value
   */
  setShape(key, value) {
    var shape = this.shape;
    // Path from string may not have shape
    if (shape) {
      if (zrUtil.isObject(key)) {
        for (var name in key) {
          if (key.hasOwnProperty(name)) {
            shape[name] = key[name];
          }
        }
      } else {
        shape[key] = value;
      }
      this.dirty(true);
    }
    return this;
  }
  createPathProxy() {
    if (this.path) return;
    this.path = new PathProxy();
  }
  getBoundingRect() {
    var rect = this._rect;
    var style = this.style;
    var needsUpdateRect = !rect;
    if (needsUpdateRect) {
      var path = this.path;
      if (!path) {
        // Create path on demand.getBoundingRect
        path = this.path = new PathProxy();
      }
      if (this.__dirtyPath) {
        path.beginPath();
        this.buildPath(path, this.shape, false);
      }
      rect = path.getBoundingRect();
    }
    this._rect = rect;

    if (style.hasStroke()) {
      // Needs update rect with stroke lineWidth when
      // 1. Element changes scale or lineWidth
      // 2. Shape is changed
      var rectWithStroke =
        this._rectWithStroke || (this._rectWithStroke = rect.clone());
      if (this.__dirty || needsUpdateRect) {
        rectWithStroke.copy(rect);
        // FIXME Must after updateTransform
        var w = style.lineWidth;
        // PENDING, Min line width is needed when line is horizontal or vertical
        var lineScale = style.strokeNoScale ? this.getLineScale() : 1;

        // Only add extra hover lineWidth when there are no fill
        if (!style.hasFill()) {
          w = Math.max(w, this.strokeContainThreshold || 4);
        }
        // Consider line width
        // Line scale can't be 0;
        if (lineScale > 1e-10) {
          rectWithStroke.width += w / lineScale;
          rectWithStroke.height += w / lineScale;
          rectWithStroke.x -= w / lineScale / 2;
          rectWithStroke.y -= w / lineScale / 2;
        }
      }

      // Return rect with stroke
      return rectWithStroke;
    }

    return rect;
  }
  contain(x, y) {
    var localPos = this.transformCoordToLocal(x, y);
    var rect = this.getBoundingRect();
    var style = this.style;
    x = localPos[0];
    y = localPos[1];

    if (rect.contain(x, y)) {
      var pathData = this.path.data;
      if (style.hasStroke()) {
        var lineWidth = style.lineWidth;
        var lineScale = style.strokeNoScale ? this.getLineScale() : 1;
        // Line scale can't be 0;
        if (lineScale > 1e-10) {
          // Only add extra hover lineWidth when there are no fill
          if (!style.hasFill()) {
            lineWidth = Math.max(lineWidth, this.strokeContainThreshold);
          }
          if (
            pathContain.containStroke(pathData, lineWidth / lineScale, x, y)
          ) {
            return true;
          }
        }
      }
      if (style.hasFill()) {
        return pathContain.contain(pathData, x, y);
      }
    }
    return false;
  }
  getLineScale() {
    var m = this.transform;
    // Get the line scale.
    // Determinant of `m` means how much the area is enlarged by the
    // transformation. So its square root can be used as a scale factor
    // for width.
    return m && abs(m[0] - 1) > 1e-10 && abs(m[3] - 1) > 1e-10
      ? Math.sqrt(abs(m[0] * m[3] - m[2] * m[1]))
      : 1;
  }
}
