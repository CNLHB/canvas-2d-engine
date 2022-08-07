import guid from './core/guid';
import Displayable from './graphic/Displayable';
import * as zrUtil from './utils/util';
import Transformable from './mixin/Transformable';

function applyMixins(derivedCtor: any, constructors: any[]) {
  constructors.forEach((baseCtor) => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
      Object.defineProperty(
        derivedCtor.prototype,
        name,
        Object.getOwnPropertyDescriptor(baseCtor.prototype, name) ||
          Object.create(null)
      );
    });
  });
}
/**
 * @alias module:zRender/Element
 * @constructor
 */
class Element extends Transformable {
  id;
  /**
   * 元素类型
   * Element type
   * @type {string}
   */
  type = 'element';
  /**
   * 元素名字
   * Element name
   * @type {string}
   */
  name = '';
  draggable;
  transform;
  animators;
  /**
   * zRender 实例对象，会在 element 添加到 zRender 实例中后自动赋值
   * zRender instance will be assigned when element is associated with zRender
   */
  __zr: any;
  /**
   * 图形是否忽略，为true时忽略图形的绘制以及事件触发
   * If ignore drawing and events of the element object
   * @name module:/zRender/Element#ignore
   * @type {boolean}
   * @default false
   */
  ignore: boolean = false;
  /**
   * 用于裁剪的路径(shape)，所有 Group 内的路径在绘制时都会被这个路径裁剪
   * 该路径会继承被裁减对象的变换
   * @type {module:zRender/graphic/Path}
   * @see http://www.w3.org/TR/2dcontext/#clipping-region
   * @readOnly
   */
  clipPath;
  /**
   * 是否是 Group
   * @type {boolean}
   */
  isGroup: false;
  constructor(opts) {
    super(opts);
    this.id = opts.id || guid();
  }
  /**
   * Drift element
   * @param  {number} dx dx on the global space
   * @param  {number} dy dy on the global space
   */
  drift(dx, dy) {
    switch (this.draggable) {
      case 'horizontal':
        dy = 0;
        break;
      case 'vertical':
        dx = 0;
        break;
    }

    var m = this.transform;
    console.log(m, 'm');

    if (!m) {
      m = this.transform = [1, 0, 0, 1, 0, 0];
    }
    m[4] += dx;
    m[5] += dy;

    this.decomposeTransform();
    this.dirty(false);
  }
  dirty(dirty) {}
  updateTransform() {}
  decomposeTransform() {}
  /**
   * Hook before update
   */
  beforeUpdate() {}
  /**
   * Hook after update
   */
  afterUpdate() {}
  /**
   * Update each frame
   */
  update() {
    this.updateTransform();
  }
  /**
   * @param  {Function} cb
   * @param  {}   context
   */
  traverse(cb, context) {}
  /**
   * @protected
   */
  attrKV(key, value) {
    if (key === 'position' || key === 'scale' || key === 'origin') {
      // Copy the array
      if (value) {
        var target = this[key];
        if (!target) {
          target = this[key] = [];
        }
        target[0] = value[0];
        target[1] = value[1];
      }
    } else {
      this[key] = value;
    }
  }
  /**
   * Hide the element
   */
  hide() {
    this.ignore = true;
    this.__zr && this.__zr.refresh();
  }
  /**
   * Show the element
   */
  show() {
    this.ignore = false;
    this.__zr && this.__zr.refresh();
  }
  /**
   * @param {string|Object} key
   * @param {*} value
   */
  attr(key, value) {
    if (typeof key === 'string') {
      this.attrKV(key, value);
    } else if (zrUtil.isObject(key)) {
      for (var name in key) {
        if (key.hasOwnProperty(name)) {
          this.attrKV(name, key[name]);
        }
      }
    }

    this.dirty(false);

    return this;
  }

  /**
   * @param {module:zRender/graphic/Path} clipPath
   */
  setClipPath(clipPath) {
    var zr = this.__zr;
    if (zr) {
      clipPath.addSelfToZr(zr);
    }

    // Remove previous clip path
    if (this.clipPath && this.clipPath !== clipPath) {
      this.removeClipPath();
    }

    this.clipPath = clipPath;
    clipPath.__zr = zr;
    clipPath.__clipTarget = this;

    this.dirty(false);
  }
  /**
   */
  removeClipPath() {
    var clipPath = this.clipPath;
    if (clipPath) {
      if (clipPath.__zr) {
        clipPath.removeSelfFromZr(clipPath.__zr);
      }

      clipPath.__zr = null;
      clipPath.__clipTarget = null;
      this.clipPath = null;

      this.dirty(false);
    }
  }
  /**
   * Add self from zRender instance.
   * Not recursively because it will be invoked when element added to storage.
   * @param {module:zRender/zRender} zr
   */
  addSelfToZr(zr) {
    this.__zr = zr;
    // 添加动画
    var animators = this.animators;
    if (animators) {
      for (var i = 0; i < animators.length; i++) {
        zr.animation.addAnimator(animators[i]);
      }
    }

    if (this.clipPath) {
      this.clipPath.addSelfToZr(zr);
    }
  }
  /**
   * Remove self from zRender instance.
   * Not recursively because it will be invoked when element added to storage.
   * @param {module:zRender/zRender} zr
   */
  removeSelfFromZr(zr) {
    this.__zr = null;
    // 移除动画
    var animators = this.animators;
    if (animators) {
      for (var i = 0; i < animators.length; i++) {
        zr.animation.removeAnimator(animators[i]);
      }
    }

    if (this.clipPath) {
      this.clipPath.removeSelfFromZr(zr);
    }
  }
}
// applyMixins(Element, [Transformable, Event]);

export default Element;
