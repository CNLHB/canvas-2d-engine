import Element from '../Element';
import Style from './Style';

export default class Displayable extends Element {
  private _dirty: boolean;
  draggable;
  transform;
  style: any;
  rectHover = false;
  _rect;
  __dirty;
  __clipPaths;
  __dirtyText;
  constructor(opts) {
    super(opts);
    opts = opts || {};

    for (var name in opts) {
      if (opts.hasOwnProperty(name) && name !== 'style') {
        this[name] = opts[name];
      }
    }
    this.style = new Style(opts.style, this);
    this._rect = null;
    // Shapes for cascade clipping.
    // Can only be `null`/`undefined` or an non-empty array, MUST NOT be an empty array.
    // because it is easy to only using null to check whether clipPaths changed.
    this.__clipPaths = null;
  }
  dirty(dirty) {
    this.__dirty = this.__dirtyText = true;

    this._rect = null;

    this.__zr && this.__zr.refresh();
  }
  /**
   * @param {Object|string} key
   * @param {*} value
   */
  setStyle(key, value) {
    this.style.set(key, value);
    this.dirty(false);
    return this;
  }
  /**
   * Use given style object
   * @param  {Object} obj
   */
  useStyle(obj) {
    this.style = new Style(obj, this);
    this.dirty(false);
    return this;
  }
  /**
   * If displayable element contain coord x, y
   * @param  {number} x
   * @param  {number} y
   * @return {boolean}
   */
  contain(x, y) {
    return this.rectContain(x, y);
  }

  /**
   * @param  {Function} cb
   * @param  {}   context
   */
  traverse(cb, context) {
    cb.call(context, this);
  }
  getBoundingRect() {
    return { contain: (x, y) => {} };
  }

  /**
   * If bounding rect of element contain coord x, y
   * @param  {number} x
   * @param  {number} y
   * @return {boolean}
   */
  rectContain(x, y) {
    var coord = this.transformCoordToLocal(x, y);
    var rect = this.getBoundingRect();
    return rect.contain(coord[0], coord[1]);
  }
}
