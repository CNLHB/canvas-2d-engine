import Element from '../Element';
export default class Group extends Element {
  __storage: any;
  __dirty;
  _children: Array<any>;
  constructor(opts) {
    super(opts);
    opts = opts || {};
    for (var key in opts) {
      if (opts.hasOwnProperty(key)) {
        this[key] = opts[key];
      }
    }

    this._children = [];

    this.__storage = null;

    this.__dirty = true;
  }
  addChildrenToStorage(storage) {
    for (var i = 0; i < this._children.length; i++) {
      var child = this._children[i];
      storage.addToStorage(child);
      if (child instanceof Group) {
        child.addChildrenToStorage(storage);
      }
    }
  }
  delChildrenFromStorage(storage) {}
}
