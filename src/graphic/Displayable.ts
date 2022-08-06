import Element from '../Element';
import Style from './Style';

export default class Displayable extends Element {
  private _dirty: boolean;
  draggable;
  transform;
  style;
  rectHover = false;
  constructor(opts) {
    super(opts);
    this.style = new Style(opts.style, this);
  }
  dirty(dirty) {
    this._dirty = dirty;
  }
  decomposeTransform() {}
  updateTransform() {}
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
