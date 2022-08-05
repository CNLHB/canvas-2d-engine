var arraySlice = Array.prototype.slice;

/**
 * Event dispatcher.
 */
class Event {
  _$handlers;
  _$eventProcessor;
  /**
     * draggable: true
        shape: {cx: 20, cy: 20, r: 30}
        style: {fill: 'blue'}
     * @param eventProcessor 
     */
  constructor(eventProcessor) {
    this._$handlers = {};
    this._$eventProcessor = eventProcessor;
  }
  one(event, query, handler, context) {
    return on(this, event, query, handler, context, true);
  }
  /**
   * Bind a handler.
   *
   * @param {string} event The event name.
   * @param {string|Object} [query] Condition used on event filter.
   * @param {Function} handler The event handler.
   * @param {Object} [context]
   */
  on(event, query, handler, context) {
    return on(this, event, query, handler, context, false);
  }
  /**
   * Whether any handler has bound.
   * 是否有任何处理程序被绑定
   * @param  {string}  event
   * @return {boolean}
   */
  isSilent(event) {
    var _h = this._$handlers;
    return !_h[event] || !_h[event].length;
  }
  /**
   * Unbind a event.
   *
   * @param {string} [event] The event name.
   *        If no `event` input, "off" all listeners.
   * @param {Function} [handler] The event handler.
   *        If no `handler` input, "off" all listeners of the `event`.
   */
  off(event, handler) {
    var _h = this._$handlers;

    if (!event) {
      this._$handlers = {};
      return this;
    }

    if (handler) {
      if (_h[event]) {
        var newList: Array<any> = [];
        for (var i = 0, l = _h[event].length; i < l; i++) {
          if (_h[event][i].h !== handler) {
            newList.push(_h[event][i]);
          }
        }
        _h[event] = newList;
      }

      if (_h[event] && _h[event].length === 0) {
        delete _h[event];
      }
    } else {
      delete _h[event];
    }

    return this;
  }
  /**
   * Dispatch a event.
   *
   * @param {string} type The event name.
   */
  trigger(type) {
    var _h = this._$handlers[type];
    var eventProcessor = this._$eventProcessor;
    if (_h) {
      var args = arguments;
      var argLen = args.length;

      if (argLen > 3) {
        args = arraySlice.call(args, 1);
      }

      var len = _h.length;
      for (var i = 0; i < len; ) {
        var hItem = _h[i];
        if (
          eventProcessor &&
          eventProcessor.filter &&
          hItem.query != null &&
          !eventProcessor.filter(type, hItem.query)
        ) {
          i++;
          continue;
        }

        // Optimize advise from backbone
        switch (argLen) {
          case 1:
            hItem.h.call(hItem.ctx);
            break;
          case 2:
            hItem.h.call(hItem.ctx, args[1]);
            break;
          case 3:
            hItem.h.call(hItem.ctx, args[1], args[2]);
            break;
          default:
            // have more than 2 given arguments
            hItem.h.apply(hItem.ctx, args);
            break;
        }

        if (hItem.one) {
          _h.splice(i, 1);
          len--;
        } else {
          i++;
        }
      }
    }

    eventProcessor &&
      eventProcessor.afterTrigger &&
      eventProcessor.afterTrigger(type);

    return this;
  }
  /**
   * Dispatch a event with context, which is specified at the last parameter.
   *
   * @param {string} type The event name.
   */
  triggerWithContext(type) {
    var _h = this._$handlers[type];
    var eventProcessor = this._$eventProcessor;

    if (_h) {
      var args = arguments;
      var argLen = args.length;

      if (argLen > 4) {
        args = arraySlice.call(args, 1, args.length - 1);
      }
      var ctx = args[args.length - 1];

      var len = _h.length;
      for (var i = 0; i < len; ) {
        var hItem = _h[i];
        if (
          eventProcessor &&
          eventProcessor.filter &&
          hItem.query != null &&
          !eventProcessor.filter(type, hItem.query)
        ) {
          i++;
          continue;
        }

        // Optimize advise from backbone
        switch (argLen) {
          case 1:
            hItem.h.call(ctx);
            break;
          case 2:
            hItem.h.call(ctx, args[1]);
            break;
          case 3:
            hItem.h.call(ctx, args[1], args[2]);
            break;
          default:
            // have more than 2 given arguments
            hItem.h.apply(ctx, args);
            break;
        }

        if (hItem.one) {
          _h.splice(i, 1);
          len--;
        } else {
          i++;
        }
      }
    }

    eventProcessor &&
      eventProcessor.afterTrigger &&
      eventProcessor.afterTrigger(type);

    return this;
  }
}

function normalizeQuery(host, query) {
  var eventProcessor = host._$eventProcessor;
  if (query != null && eventProcessor && eventProcessor.normalizeQuery) {
    query = eventProcessor.normalizeQuery(query);
  }
  return query;
}

function on(eventful, event, query, handler, context, isOnce) {
  var _h = eventful._$handlers;
  console.log('_h', _h);
  if (typeof query === 'function') {
    context = handler;
    handler = query;
    query = null;
  }

  if (!handler || !event) {
    return eventful;
  }

  query = normalizeQuery(eventful, query);

  if (!_h[event]) {
    _h[event] = [];
  }

  for (var i = 0; i < _h[event].length; i++) {
    if (_h[event][i].h === handler) {
      return eventful;
    }
  }

  var wrap = {
    h: handler,
    one: isOnce,
    query: query,
    ctx: context || eventful,
    // FIXME
    // Do not publish this feature util it is proved that it makes sense.
    callAtLast: handler.zrEventfulCallAtLast,
  };

  var lastIndex = _h[event].length - 1;
  var lastWrap = _h[event][lastIndex];
  lastWrap && lastWrap.callAtLast
    ? _h[event].splice(lastIndex, 0, wrap)
    : _h[event].push(wrap);

  return eventful;
}

export default Event;
