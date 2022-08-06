import Draggable from './core/Draggable';
import * as vec2 from './core/vector';

import * as util from './utils/util';
var SILENT = 'silent';

var handlerNames = [
  'click',
  'dblclick',
  'mousewheel',
  'mouseout',
  'mouseup',
  'mousedown',
  'mousemove',
  'contextmenu',
];
export default class Handler extends Draggable {
  storage;
  painter;
  painterRoot;
  proxy;
  _hovered;
  _lastTouchMoment;
  _lastX;
  _lastY;
  _gestureMgr;
  _downEl;
  _downPoint;
  _upEl;
  constructor(storage, painter, proxy, painterRoot) {
    super();
    this.storage = storage;
    this.painter = painter;
    this.painterRoot = painterRoot;
    proxy = proxy;
    // || new EmptyProxy();

    /**
     * Proxy of event. can be Dom, WebGLSurface, etc.
     */
    this.proxy = null;

    /**
     * {target, topTarget, x, y}
     * @private
     * @type {Object}
     */
    this._hovered = {};
    /**
     * @private
     * @type {Date}
     */
    this._lastTouchMoment;

    /**
     * @private
     * @type {number}
     */
    this._lastX;

    /**
     * @private
     * @type {number}
     */
    this._lastY;

    /**
     * @private
     * @type {module:zrender/core/GestureMgr}
     */
    this._gestureMgr;

    // Draggable.call(this);

    this.setHandlerProxy(proxy);
  }
  /**
   * @private
   * @param {number} x
   * @param {number} y
   * @param {module:zrender/graphic/Displayable} exclude
   * @return {model:zrender/Element}
   * @method
   */
  findHover(x, y, exclude?) {
    var list = this.storage.getDisplayList();
    var out: any = { x: x, y: y };

    for (var i = list.length - 1; i >= 0; i--) {
      var hoverCheckResult;
      if (
        list[i] !== exclude &&
        // getDisplayList may include ignored item in VML mode
        !list[i].ignore &&
        (hoverCheckResult = isHover(list[i], x, y))
      ) {
        !out.topTarget && (out.topTarget = list[i]);
        if (hoverCheckResult !== SILENT) {
          out.target = list[i];
          break;
        }
      }
    }

    return out;
  }
  resize() {}
  setCursorStyle(cursorStyle) {}
  dispose() {}
  setHandlerProxy(proxy) {
    if (this.proxy) {
      this.proxy.dispose();
    }
    if (proxy) {
      util.each(
        handlerNames,
        function (name) {
          proxy.on && proxy.on(name, this[name], this);
        },
        this
      );
      // Attach handler
      proxy.handler = this;
    }
    this.proxy = proxy;
  }
  click() {}
  dblclick() {}
  mousewheel() {}
  mouseout() {}
  mouseup() {}
  mousemove() {}
  mousedown(event) {
    console.log('handler', event);
    console.log('handler', { x: event.zrX, y: event.zrY });
    this.handlerComm('mousedown', event);
  }
  /**处理后派发给实例和元素
   *targetInfo目标元素
   */
  dispatchToElement(targetInfo, eventName, event) {
    this.trigger(eventName, event);
  }
  contextmenu() {}
  handlerComm(name, event) {
    var x = event.zrX;
    var y = event.zrY;
    var isOutside = isOutsideBoundary(this, x, y);

    var hovered;
    var hoveredTarget;

    if (name !== 'mouseup' || !isOutside) {
      // Find hover again to avoid click event is dispatched manually. Or click is triggered without mouseover
      hovered = this.findHover(x, y);
      hoveredTarget = hovered.target;
    }

    if (name === 'mousedown') {
      this._downEl = hoveredTarget;
      this._downPoint = [event.zrX, event.zrY];
      // In case click triggered before mouseup
      this._upEl = hoveredTarget;
    } else if (name === 'mouseup') {
      this._upEl = hoveredTarget;
    } else if (name === 'click') {
      if (
        this._downEl !== this._upEl ||
        // Original click event is triggered on the whole canvas element,
        // including the case that `mousedown` - `mousemove` - `mouseup`,
        // which should be filtered, otherwise it will bring trouble to
        // pan and zoom.
        !this._downPoint ||
        // Arbitrary value
        vec2.dist(this._downPoint, [event.zrX, event.zrY]) > 4
      ) {
        return;
      }
      this._downPoint = null;
    }
    console.log(hovered);

    this.dispatchToElement(hovered, name, event);
  }
}
/**
 * See [Drag outside].
 */
function isOutsideBoundary(handlerInstance, x, y) {
  var painter = handlerInstance.painter;
  return x < 0 || x > painter.getWidth() || y < 0 || y > painter.getHeight();
}

function isHover(displayable, x, y) {
  if (displayable[displayable.rectHover ? 'rectContain' : 'contain'](x, y)) {
    var el = displayable;
    var isSilent;
    while (el) {
      // If clipped by ancestor.
      // FIXME: If clipPath has neither stroke nor fill,
      // el.clipPath.contain(x, y) will always return false.
      if (el.clipPath && !el.clipPath.contain(x, y)) {
        return false;
      }
      if (el.silent) {
        isSilent = true;
      }
      el = el.parent;
    }
    return isSilent ? SILENT : true;
  }

  return false;
}
