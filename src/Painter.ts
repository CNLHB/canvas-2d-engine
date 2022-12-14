import Layer from './Layer';
import * as util from './utils/util';
import env from './core/env';
import timsort from './core/timsort';

var HOVER_LAYER_ZLEVEL = 1e5;
var CANVAS_ZLEVEL = 314159;

var EL_AFTER_INCREMENTAL_INC = 0.01;
var INCREMENTAL_INC = 0.001;
function logError(log) {
  console.error(log);
}
function isLayerValid(layer) {
  if (!layer) {
    return false;
  }

  if (layer.__builtin__) {
    return true;
  }

  if (
    typeof layer.resize !== 'function' ||
    typeof layer.refresh !== 'function'
  ) {
    return false;
  }

  return true;
}
function parseInt10(val) {
  return parseInt(val, 10);
}
function isDisplayableCulled(el, width, height) {
  //   tmpRect.copy(el.getBoundingRect());
  //   if (el.transform) {
  //     tmpRect.applyTransform(el.transform);
  //   }
  //   viewRect.width = width;
  //   viewRect.height = height;
  //   return !tmpRect.intersect(viewRect);
}
function createRoot(width, height) {
  var domRoot = document.createElement('div');

  // domRoot.onselectstart = returnFalse; // Avoid page selected
  domRoot.style.cssText =
    [
      'position:relative',
      // IOS13 safari probably has a compositing bug (z order of the canvas and the consequent
      // dom does not act as expected) when some of the parent dom has
      // `-webkit-overflow-scrolling: touch;` and the webpage is longer than one screen and
      // the canvas is not at the top part of the page.
      // Check `https://bugs.webkit.org/show_bug.cgi?id=203681` for more details. We remove
      // this `overflow:hidden` to avoid the bug.
      // 'overflow:hidden',
      'width:' + width + 'px',
      'height:' + height + 'px',
      'padding:0',
      'margin:0',
      'border-width:0',
    ].join(';') + ';';

  return domRoot;
}
export default class Painter {
  _opts;
  type;
  dpr;
  _singleCanvas;
  root;
  storage;
  _layers;
  _zlevelList;
  _layerConfig;
  _hoverlayer;
  _hoverElements;
  _width;
  _height;
  _needsManuallyCompositing;
  _domRoot;
  _redrawId;
  _backgroundColor;
  constructor(root, storage, opts, id?) {
    this.type = 'canvas';

    // In node environment using node-canvas
    var singleCanvas =
      !root.nodeName || // In node ?
      root.nodeName.toUpperCase() === 'CANVAS';

    this._opts = opts = util.extend({}, opts || {});

    /**
     * @type {number}
     */
    this.dpr = opts.devicePixelRatio || devicePixelRatio;
    /**
     * @type {boolean}
     * @private
     */
    this._singleCanvas = singleCanvas;
    /**
     * ????????????
     * @type {HTMLElement}
     */
    this.root = root;

    var rootStyle = root.style;

    if (rootStyle) {
      rootStyle['-webkit-tap-highlight-color'] = 'transparent';
      rootStyle['-webkit-user-select'] =
        rootStyle['user-select'] =
        rootStyle['-webkit-touch-callout'] =
          'none';

      root.innerHTML = '';
    }

    /**
     * @type {module:zrender/Storage}
     */
    this.storage = storage;

    /**
     * @type {Array.<number>}
     * @private
     */
    var zlevelList: Array<any> = (this._zlevelList = []);

    /**
     * @type {Object.<string,Layer>}
     * @private
     */
    var layers = (this._layers = {});

    /**
     * @type {Object.<string, Object>}
     * @private
     */
    this._layerConfig = {};

    /**
     * zrender will do compositing when root is a canvas and have multiple zlevels.
     */
    this._needsManuallyCompositing = false;
    // console.log('singleCanvas', singleCanvas);

    if (!singleCanvas) {
      this._width = this._getSize(0);
      this._height = this._getSize(1);

      var domRoot = (this._domRoot = createRoot(this._width, this._height));
      root.appendChild(domRoot);
    } else {
      var width = root.width;
      var height = root.height;

      if (opts.width != null) {
        width = opts.width;
      }
      if (opts.height != null) {
        height = opts.height;
      }
      this.dpr = opts.devicePixelRatio || 1;

      // Use canvas width and height directly
      root.width = width * this.dpr;
      root.height = height * this.dpr;

      this._width = width;
      this._height = height;

      // Create layer if only one given canvas
      // Device can be specified to create a high dpi image.
      var mainLayer = new Layer(id, this, this.dpr);
      mainLayer.__builtin__ = true;
      mainLayer.initContext();
      // FIXME Use canvas width and height
      // mainLayer.resize(width, height);
      layers[CANVAS_ZLEVEL] = mainLayer;
      mainLayer.zlevel = CANVAS_ZLEVEL;
      // Not use common zlevel.
      zlevelList.push(CANVAS_ZLEVEL);

      this._domRoot = root;
    }

    /**
     * @type {module:Layer}
     * @private
     */
    this._hoverlayer = null;

    this._hoverElements = [];
  }
  /**
   * @return {HTMLDivElement}
   */
  getViewportRoot() {
    return this._domRoot;
  }
  _getSize(whIdx): any {
    var opts = this._opts;
    var wh = ['width', 'height'][whIdx];
    var cwh = ['clientWidth', 'clientHeight'][whIdx];
    var plt = ['paddingLeft', 'paddingTop'][whIdx];
    var prb = ['paddingRight', 'paddingBottom'][whIdx];

    if (opts[wh] != null && opts[wh] !== 'auto') {
      return parseFloat(opts[wh]);
    }

    var root = this.root;
    // IE8 does not support getComputedStyle, but it use VML.
    var stl;
    if (document && document.defaultView) {
      stl = document.defaultView.getComputedStyle(root);
    }

    return (
      ((root[cwh] || parseInt10(stl[wh]) || parseInt10(root.style[wh])) -
        (parseInt10(stl[plt]) || 0) -
        (parseInt10(stl[prb]) || 0)) |
      0
    );
  }
  /**
   * ????????????zlevel???????????????
   *
   * @param {string} zlevel
   * @param {Object} config ????????????
   * @param {string} [config.clearColor=0] ???????????????????????????
   * @param {string} [config.motionBlur=false] ????????????????????????
   * @param {number} [config.lastFrameAlpha=0.7]
   * ????????????????????????????????????????????????????????????alpha??????????????????????????????
   */
  configLayer(zlevel, config) {
    if (config) {
      var layerConfig = this._layerConfig;
      if (!layerConfig[zlevel]) {
        layerConfig[zlevel] = config;
      } else {
        util.merge(layerConfig[zlevel], config, true);
      }

      for (var i = 0; i < this._zlevelList.length; i++) {
        var _zlevel = this._zlevelList[i];
        // TODO Remove EL_AFTER_INCREMENTAL_INC magic number
        if (
          _zlevel === zlevel ||
          _zlevel === zlevel + EL_AFTER_INCREMENTAL_INC
        ) {
          var layer = this._layers[_zlevel];
          util.merge(layer, layerConfig[zlevel], true);
        }
      }
    }
  }
  setBackgroundColor(backgroundColor) {}
  /**
   * ??????
   * @param {boolean} [paintAll=false] ??????????????????displayable
   */
  refresh(paintAll?) {
    // console.log('painter Refresh', paintAll);
    // console.log(this.storage);

    var list = this.storage.getDisplayList(true);

    var zlevelList = this._zlevelList;

    this._redrawId = Math.random();

    this._paintList(list, paintAll, this._redrawId);

    // Paint custum layers
    for (var i = 0; i < zlevelList.length; i++) {
      var z = zlevelList[i];
      var layer = this._layers[z];
      if (!layer.__builtin__ && layer.refresh) {
        var clearColor = i === 0 ? this._backgroundColor : null;
        layer.refresh(clearColor);
      }
    }

    this.refreshHover();

    return this;
  }
  _paintList(list, paintAll, redrawId) {
    if (this._redrawId !== redrawId) {
      return;
    }

    paintAll = paintAll || false;

    this._updateLayerStatus(list);

    var finished = this._doPaintList(list, paintAll);

    if (this._needsManuallyCompositing) {
      this._compositeManually();
    }

    if (!finished) {
      var self: Painter = this;
      requestAnimationFrame(function () {
        self._paintList(list, paintAll, redrawId);
      });
    }
  }
  _compositeManually() {
    var ctx = this.getLayer(CANVAS_ZLEVEL).ctx;
    var width = this._domRoot.width;
    var height = this._domRoot.height;
    ctx.clearRect(0, 0, width, height);
    // PENDING, If only builtin layer?
    // this.eachBuiltinLayer(function (layer) {
    //   if (layer.virtual) {
    //     ctx.drawImage(layer.dom, 0, 0, width, height);
    //   }
    // });
  }
  _updateLayerStatus(list) {
    // this.eachBuiltinLayer(function (layer, z) {
    //   layer.__dirty = layer.__used = false;
    // });
    // console.log('_updateLayerStatus');

    function updatePrevLayer(idx) {
      if (prevLayer) {
        if (prevLayer.__endIndex !== idx) {
          prevLayer.__dirty = true;
        }
        prevLayer.__endIndex = idx;
      }
    }

    if (this._singleCanvas) {
      for (var i = 1; i < list.length; i++) {
        var el = list[i];
        if (el.zlevel !== list[i - 1].zlevel || el.incremental) {
          this._needsManuallyCompositing = true;
          break;
        }
      }
    }

    var prevLayer: any = null;
    var incrementalLayerCount = 0;
    var prevZlevel;
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      var zlevel = el.zlevel;
      var layer;

      if (prevZlevel !== zlevel) {
        prevZlevel = zlevel;
        incrementalLayerCount = 0;
      }

      // TODO Not use magic number on zlevel.

      // Each layer with increment element can be separated to 3 layers.
      //          (Other Element drawn after incremental element)
      // -----------------zlevel + EL_AFTER_INCREMENTAL_INC--------------------
      //                      (Incremental element)
      // ----------------------zlevel + INCREMENTAL_INC------------------------
      //              (Element drawn before incremental element)
      // --------------------------------zlevel--------------------------------
      if (el.incremental) {
        layer = this.getLayer(
          zlevel + INCREMENTAL_INC,
          this._needsManuallyCompositing
        );
        layer.incremental = true;
        incrementalLayerCount = 1;
      } else {
        layer = this.getLayer(
          zlevel + incrementalLayerCount > 0 ? EL_AFTER_INCREMENTAL_INC : 0,
          this._needsManuallyCompositing
        );
      }

      if (!layer.__builtin__) {
        logError(
          'ZLevel ' + zlevel + ' has been used by unkown layer ' + layer.id
        );
      }

      if (layer !== prevLayer) {
        layer.__used = true;
        if (layer.__startIndex !== i) {
          layer.__dirty = true;
        }
        layer.__startIndex = i;
        if (!layer.incremental) {
          layer.__drawIndex = i;
        } else {
          // Mark layer draw index needs to update.
          layer.__drawIndex = -1;
        }
        updatePrevLayer(i);
        prevLayer = layer;
      }
      if (el.__dirty) {
        layer.__dirty = true;
        if (layer.incremental && layer.__drawIndex < 0) {
          // Start draw from the first dirty element.
          layer.__drawIndex = i;
        }
      }
    }

    updatePrevLayer(i);

    // this.eachBuiltinLayer(function (layer, z) {
    //   // Used in last frame but not in this frame. Needs clear
    //   if (!layer.__used && layer.getElementCount() > 0) {
    //     layer.__dirty = true;
    //     layer.__startIndex = layer.__endIndex = layer.__drawIndex = 0;
    //   }
    //   // For incremental layer. In case start index changed and no elements are dirty.
    //   if (layer.__dirty && layer.__drawIndex < 0) {
    //     layer.__drawIndex = layer.__startIndex;
    //   }
    // });
  }
  _doPaintList(list, paintAll) {
    var layerList: Array<any> = [];
    for (var zi = 0; zi < this._zlevelList.length; zi++) {
      var zlevel = this._zlevelList[zi];
      var layer = this._layers[zlevel];
      if (
        layer.__builtin__ &&
        layer !== this._hoverlayer &&
        (layer.__dirty || paintAll)
      ) {
        layerList.push(layer);
      }
    }

    var finished = true;

    for (var k = 0; k < layerList.length; k++) {
      var layer = layerList[k];
      var ctx = layer.ctx;
      var scope: any = {};
      ctx.save();

      var start = paintAll ? layer.__startIndex : layer.__drawIndex;

      var useTimer = !paintAll && layer.incremental && Date.now;
      var startTime = useTimer && Date.now();

      var clearColor =
        layer.zlevel === this._zlevelList[0] ? this._backgroundColor : null;
      // All elements in this layer are cleared.
      if (layer.__startIndex === layer.__endIndex) {
        layer.clear(false, clearColor);
      } else if (start === layer.__startIndex) {
        var firstEl = list[start];
        if (!firstEl.incremental || !firstEl.notClear || paintAll) {
          layer.clear(false, clearColor);
        }
      }
      if (start === -1) {
        console.error('For some unknown reason. drawIndex is -1');
        start = layer.__startIndex;
      }
      for (var i = start; i < layer.__endIndex; i++) {
        var el = list[i];
        this._doPaintEl(el, layer, paintAll, scope);
        el.__dirty = el.__dirtyText = false;

        if (useTimer) {
          // Date.now can be executed in 13,025,305 ops/second.
          var dTime = Date.now() - startTime;
          // Give 15 millisecond to draw.
          // The rest elements will be drawn in the next frame.
          if (dTime > 15) {
            break;
          }
        }
      }

      layer.__drawIndex = i;

      if (layer.__drawIndex < layer.__endIndex) {
        finished = false;
      }

      if (scope.prevElClipPaths) {
        // Needs restore the state. If last drawn element is in the clipping area.
        ctx.restore();
      }

      ctx.restore();
    }

    if (env.wxa) {
      // Flush for weixin application
      util.each(this._layers, function (layer) {
        if (layer && layer.ctx && layer.ctx.draw) {
          layer.ctx.draw();
        }
      });
    }

    return finished;
  }
  _doPaintEl(el, currentLayer, forcePaint, scope) {
    var ctx = currentLayer.ctx;
    var m = el.transform;
    // console.log('el', el);

    if (
      (currentLayer.__dirty || forcePaint) &&
      // Ignore invisible element
      !el.invisible &&
      // Ignore transparent element
      el.style.opacity !== 0 &&
      // Ignore scale 0 element, in some environment like node-canvas
      // Draw a scale 0 element can cause all following draw wrong
      // And setTransform with scale 0 will cause set back transform failed.
      !(m && !m[0] && !m[3]) &&
      // Ignore culled element
      !(el.culling && isDisplayableCulled(el, this._width, this._height))
    ) {
      var clipPaths = el.__clipPaths;
      var prevElClipPaths = scope.prevElClipPaths;

      // Optimize when clipping on group with several elements
      if (!prevElClipPaths) {
        //|| isClipPathChanged(clipPaths, prevElClipPaths)
        // If has previous clipping state, restore from it
        if (prevElClipPaths) {
          ctx.restore();
          scope.prevElClipPaths = null;
          // Reset prevEl since context has been restored
          scope.prevEl = null;
        }
        // New clipping state
        if (clipPaths) {
          ctx.save();
          //   doClip(clipPaths, ctx);
          scope.prevElClipPaths = clipPaths;
        }
      }
      el.beforeBrush && el.beforeBrush(ctx);

      el.brush(ctx, scope.prevEl || null);
      scope.prevEl = el;

      el.afterBrush && el.afterBrush(ctx);
    }
  }
  /**
   * ?????? zlevel ??????????????????????????????????????????????????????
   * @param {number} zlevel
   * @param {boolean} virtual Virtual layer will not be inserted into dom.
   * @return {Layer}
   */
  getLayer(zlevel, virtual?) {
    // console.log('getLayer');

    if (this._singleCanvas && !this._needsManuallyCompositing) {
      zlevel = CANVAS_ZLEVEL;
    }
    var layer = this._layers[zlevel];
    // console.log(layer, 'layer');
    if (!layer) {
      // Create a new layer
      layer = new Layer('zr_' + zlevel, this, this.dpr);
      layer.zlevel = zlevel;
      layer.__builtin__ = true;

      if (this._layerConfig[zlevel]) {
        util.merge(layer, this._layerConfig[zlevel], true);
      }
      // TODO Remove EL_AFTER_INCREMENTAL_INC magic number
      else if (this._layerConfig[zlevel - EL_AFTER_INCREMENTAL_INC]) {
        util.merge(
          layer,
          this._layerConfig[zlevel - EL_AFTER_INCREMENTAL_INC],
          true
        );
      }

      if (virtual) {
        layer.virtual = virtual;
      }

      this.insertLayer(zlevel, layer);

      // Context is created after dom inserted to document
      // Or excanvas will get 0px clientWidth and clientHeight
      layer.initContext();
    }

    return layer;
  }
  insertLayer(zlevel, layer) {
    var layersMap = this._layers;
    var zlevelList = this._zlevelList;
    var len = zlevelList.length;
    var prevLayer: any;
    var i = -1;
    var domRoot = this._domRoot;

    if (layersMap[zlevel]) {
      logError('ZLevel ' + zlevel + ' has been used already');
      return;
    }
    // Check if is a valid layer
    if (!isLayerValid(layer)) {
      logError('Layer of zlevel ' + zlevel + ' is not valid');
      return;
    }

    if (len > 0 && zlevel > zlevelList[0]) {
      for (i = 0; i < len - 1; i++) {
        if (zlevelList[i] < zlevel && zlevelList[i + 1] > zlevel) {
          break;
        }
      }
      prevLayer = layersMap[zlevelList[i]];
    }
    zlevelList.splice(i + 1, 0, zlevel);

    layersMap[zlevel] = layer;

    // Vitual layer will not directly show on the screen.
    // (It can be a WebGL layer and assigned to a ZImage element)
    // But it still under management of zrender.
    if (!layer.virtual) {
      if (prevLayer) {
        var prevDom = prevLayer.dom;
        if (prevDom.nextSibling) {
          domRoot.insertBefore(layer.dom, prevDom.nextSibling);
        } else {
          domRoot.appendChild(layer.dom);
        }
      } else {
        if (domRoot.firstChild) {
          domRoot.insertBefore(layer.dom, domRoot.firstChild);
        } else {
          domRoot.appendChild(layer.dom);
        }
      }
    }
  }
  // Iterate each other layer except buildin layer
  eachOtherLayer(cb, context) {
    var zlevelList = this._zlevelList;
    var layer;
    var z;
    var i;
    for (i = 0; i < zlevelList.length; i++) {
      z = zlevelList[i];
      layer = this._layers[z];
      if (!layer.__builtin__) {
        cb.call(context, layer, z);
      }
    }
  }
  addHover(el, style) {}
  removeHover(el) {}
  clearHover() {}
  refreshHover() {
    var hoverElements = this._hoverElements;
    var len = hoverElements.length;
    var hoverLayer = this._hoverlayer;
    hoverLayer && hoverLayer.clear();

    if (!len) {
      return;
    }
    timsort(hoverElements, this.storage.displayableSortFunc);

    // Use a extream large zlevel
    // FIXME?
    console.log('this HOVER_LAYER_ZLEVEL');
    if (!hoverLayer) {
      hoverLayer = this._hoverlayer = this.getLayer(HOVER_LAYER_ZLEVEL);
    }

    var scope = {};
    hoverLayer.ctx.save();
    for (var i = 0; i < len; ) {
      var el = hoverElements[i];
      var originalEl = el.__from;
      // Original el is removed
      // PENDING
      if (!(originalEl && originalEl.__zr)) {
        hoverElements.splice(i, 1);
        originalEl.__hoverMir = null;
        len--;
        continue;
      }
      i++;

      // Use transform
      // FIXME style and shape ?
      if (!originalEl.invisible) {
        el.transform = originalEl.transform;
        el.invTransform = originalEl.invTransform;
        el.__clipPaths = originalEl.__clipPaths;
        // el.
        this._doPaintEl(el, hoverLayer, true, scope);
      }
    }

    hoverLayer.ctx.restore();
  }
  resize(w, h) {}
  pathToImage(e, dpr) {}
  clear() {}
  /**
   * ????????????????????????
   */
  getWidth() {
    return this._width;
  }

  /**
   * ????????????????????????
   */
  getHeight() {
    return this._height;
  }
  dispose() {}
}
