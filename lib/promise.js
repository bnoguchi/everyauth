var Promise = module.exports = function (values) {
  this._callbacks = [];
  this._errbacks = [];
  if (arguments.length > 0) {
    this.fulfill.apply(this, values);
  }
};

Promise.prototype = {
    callback: function (fn, scope) {
      if (this.values) {
        return fn.apply(scope, this.values);
      } 
      this._callback.push([fn, scope]);
      return this;
    }
  , errback: function (fn, scope) {
      if (this.err) {
        return fn.call(scope, this.err);
      }
      this._errbacks.push([fn, scope]);
      return this;
    }
  , fulfill: function () {
      var callbacks = this._callbacks;
      this.values = arguments;
      for (var i = 0, l = callbacks.length; i < l; i++) {
        callbacks[i][0].apply(callbacks[i][1], arguments);
      }
      return this;
    }
  , fail: function (err) {
      var errbacks = this._errbacks;
      this.err = err;
      for (var i = 0, l = errbacks.length; i < l; i++) {
        errbacks[i][0].call(errbacks[i][1], err);
      }
      return this;
    }
};
