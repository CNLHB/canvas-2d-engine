import Event from '../event/event';

export default class Displayable extends Element {
  private _dirty: boolean;
  draggable;
  transform;
  constructor(opts) {
    super();
  }
  dirty(dirty) {
    this._dirty = dirty;
  }
  decomposeTransform() {}
  updateTransform() {}
}
