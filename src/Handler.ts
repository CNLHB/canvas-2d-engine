import Draggable from './core/Draggable';
import * as vec2 from './core/vector';
import { isDomLevel2 } from './event/event';

import * as util from './utils/util';
var SILENT = 'silent';
/**
 * preventDefault and stopPropagation.
 * Notice: do not use this method in zrender. It can only be
 * used by upper applications if necessary.
 *
 * @param {Event} e A mouse or touch event.
 */
export var stop = isDomLevel2
  ? function (e) {
      e.preventDefault();
      e.stopPropagation();
      e.cancelBubble = true;
    }
  : function (e) {
      e.returnValue = false;
      e.cancelBubble = true;
    };
function stopEvent() {
  stop(this.event);
}
function makeEventPacket(eveType, targetInfo, event) {
  return {
    type: eveType,
    event: event,
    // target can only be an element that is not silent.
    target: targetInfo.target,
    // topTarget can be a silent element.
    topTarget: targetInfo.topTarget,
    cancelBubble: false,
    offsetX: event.zrX,
    offsetY: event.zrY,
    gestureEvent: event.gestureEvent,
    pinchX: event.pinchX,
    pinchY: event.pinchY,
    pinchScale: event.pinchScale,
    wheelDelta: event.zrDelta,
    zrByTouch: event.zrByTouch,
    which: event.which,
    stop: stopEvent,
  };
}

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
   * @param {module:/graphic/Displayable} exclude
   * @return {model:/Element}
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
  click(event) {
    this.handlerComm('click', event);
  }
  dblclick(event) {
    this.handlerComm('dblclick', event);
  }
  mousewheel() {}
  mouseout() {}
  mouseup(event) {
    this.handlerComm('mouseup', event);
  }
  mousemove(event) {
    var x = event.zrX;
    var y = event.zrY;
    // console.log('event', event);
    var isOutside = isOutsideBoundary(this, x, y);

    var lastHovered = this._hovered;
    var lastHoveredTarget = lastHovered.target;

    // If lastHoveredTarget is removed from zr (detected by '__zr') by some API call
    // (like 'setOption' or 'dispatchAction') in event handlers, we should find
    // lastHovered again here. Otherwise 'mouseout' can not be triggered normally.
    // See #6198.
    if (lastHoveredTarget && !lastHoveredTarget.__zr) {
      lastHovered = this.findHover(lastHovered.x, lastHovered.y);
      lastHoveredTarget = lastHovered.target;
    }

    var hovered = (this._hovered = isOutside
      ? { x: x, y: y }
      : this.findHover(x, y));
    // console.log(hovered);
    var hoveredTarget = hovered.target;

    var proxy = this.proxy;
    proxy.setCursor &&
      proxy.setCursor(hoveredTarget ? hoveredTarget.cursor : 'default');

    // Mouse out on previous hovered element
    if (lastHoveredTarget && hoveredTarget !== lastHoveredTarget) {
      this.dispatchToElement(lastHovered, 'mouseout', event);
    }

    // Mouse moving on one element
    this.dispatchToElement(hovered, 'mousemove', event);

    // Mouse over on a new element
    if (hoveredTarget && hoveredTarget !== lastHoveredTarget) {
      this.dispatchToElement(hovered, 'mouseover', event);
    }
  }
  mousedown(event) {
    this.handlerComm('mousedown', event);
  }
  /**处理后派发给实例和元素
   *targetInfo目标元素
   */
  dispatchToElement(targetInfo, eventName, event) {
    targetInfo = targetInfo || {};
    var el = targetInfo.target;

    if (el && el.silent) {
      return;
    }
    var eventHandler = 'on' + eventName;

    // 重新组装Event对象，派发给画布元素
    var eventPacket = makeEventPacket(eventName, targetInfo, event);

    while (el) {
      el[eventHandler] &&
        (eventPacket.cancelBubble = el[eventHandler].call(el, eventPacket));
      el.trigger(eventName, eventPacket);

      el = el.parent;

      if (eventPacket.cancelBubble) {
        break;
      }
    }

    if (!eventPacket.cancelBubble) {
      // 冒泡到顶级 zrender 对象
      this.trigger(eventName, eventPacket);
      // 分发事件到用户自定义层
      // 用户有可能在全局 click 事件中 dispose，所以需要判断下 painter 是否存在
      this.painter &&
        this.painter.eachOtherLayer(function (layer) {
          if (typeof layer[eventHandler] === 'function') {
            layer[eventHandler].call(layer, eventPacket);
          }
          if (layer.trigger) {
            console.log('xxx');
            layer.trigger(eventName, eventPacket);
          }
        });
    }
  }
  contextmenu(event) {
    this.handlerComm('contextmenu', event);
  }
  //'click', 'mousedown', 'mouseup', 'mousewheel', 'dblclick', 'contextmenu'
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
    // console.log(hovered);
    console.log(`handler : ${name}`, { x, y });
    console.log('hovered', hovered);

    this.dispatchToElement(hovered, name, event);
  }
}
/**是否为外边界
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
