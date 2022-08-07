/**
 * 内容仓库 (M)
 * @alias module:zrender/Storage
 * @constructor
 */

import * as util from './utils/util';
import Group from './container/Group';
import Path from './graphic/Path';
export default class Storage {
  _roots: Array<any>;
  _displayList: Array<any>;
  _displayListLen: number;
  constructor() {
    this._roots = [];
    this._displayList = [];
    this._displayListLen = 0;
  }
  /**
   * 添加图形(Shape)或者组(Group)到根节点
   * @param {Element} el
   */
  addRoot(el: Group) {
    if (el.__storage === this) {
      return;
    }

    if (el instanceof Group) {
      el.addChildrenToStorage(this);
    }

    this.addToStorage(el);
    this._roots.push(el);
  }
  /**
   * 删除指定的图形(Shape)或者组(Group)
   * @param {string|Array.<string>} [el] 如果为空清空整个Storage
   */
  delRoot(el?) {
    if (el == null) {
      // 不指定el清空
      for (var i = 0; i < this._roots.length; i++) {
        var root = this._roots[i];
        if (root instanceof Group) {
          root.delChildrenFromStorage(this);
        }
      }

      this._roots = [];
      this._displayList = [];
      this._displayListLen = 0;

      return;
    }

    if (el instanceof Array) {
      for (var i = 0, l = el.length; i < l; i++) {
        this.delRoot(el[i]);
      }
      return;
    }

    var idx = util.indexOf(this._roots, el);
    if (idx >= 0) {
      this.delFromStorage(el);
      this._roots.splice(idx, 1);
      if (el instanceof Group) {
        el.delChildrenFromStorage(this);
      }
    }
  }
  _updateAndAddDisplayable(el, clipPaths, includeIgnore) {
    if (el.ignore && !includeIgnore) {
      return;
    }

    el.beforeUpdate();

    if (el.__dirty) {
      el.update();
    }

    el.afterUpdate();
    if (el.isGroup) {
      var children = el._children;

      for (var i = 0; i < children.length; i++) {
        var child = children[i];

        // Force to mark as dirty if group is dirty
        // FIXME __dirtyPath ?
        if (el.__dirty) {
          child.__dirty = true;
        }

        this._updateAndAddDisplayable(child, clipPaths, includeIgnore);
      }

      // Mark group clean here
      el.__dirty = false;
    } else {
      el.__clipPaths = clipPaths;

      this._displayList[this._displayListLen++] = el;
    }
  }
  addToStorage(el: any): any {
    if (el) {
      el.__storage = this;
      el.dirty(false);
    }
    return this;
  }
  delFromStorage(el): any {
    if (el) {
      el.__storage = null;
    }
    return this;
  }
  /**
   * 返回所有图形的绘制队列
   * @param {boolean} [update=false] 是否在返回前更新该数组
   * @param {boolean} [includeIgnore=false] 是否包含 ignore 的数组, 在 update 为 true 的时候有效
   *
   * 详见{@link module:zrender/graphic/Displayable.prototype.updateDisplayList}
   * @return {Array.<module:zrender/graphic/Displayable>}
   */
  getDisplayList(update, includeIgnore) {
    includeIgnore = includeIgnore || false;
    if (update) {
      console.log('getDisplayList');

      this.updateDisplayList(includeIgnore);
    }
    return this._displayList;
  }
  /**
   * 更新图形的绘制队列。
   * 每次绘制前都会调用，该方法会先深度优先遍历整个树，更新所有Group和Shape的变换并且把所有可见的Shape保存到数组中，
   * 最后根据绘制的优先级（zlevel > z > 插入顺序）排序得到绘制队列
   * @param {boolean} [includeIgnore=false] 是否包含 ignore 的数组
   */
  updateDisplayList(includeIgnore) {
    this._displayListLen = 0;

    var roots = this._roots;
    var displayList = this._displayList;
    for (var i = 0, len = roots.length; i < len; i++) {
      this._updateAndAddDisplayable(roots[i], null, includeIgnore);
    }

    displayList.length = this._displayListLen;

    // env.canvasSupported && timsort(displayList, shapeCompareFunc);
  }
  /**
   * 清空并且释放Storage
   */
  dispose() {
    this._roots = [];
    // this._renderList = [];
  }
}
