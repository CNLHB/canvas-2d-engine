/**
 * 内容仓库 (M)
 * @alias module:zrender/Storage
 * @constructor
 */

export default class Storage {
  _roots;
  _displayList;
  _displayListLen;
  constructor() {
    this._roots = [];

    this._displayList = [];

    this._displayListLen = 0;
  }
  addRoot(el) {}
}
