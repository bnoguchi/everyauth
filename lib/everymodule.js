var EventEmitter = require('events').EventEmitter
  , OAuth = require('oauth').OAuth2
  , url = require('url');

var EveryModule = module.exports = function () {
  EventEmitter.call(this);
  this.routes = { get: {}, post: {}};
};

EveryModule.prototype.__proto__ = EventEmitter.prototype;

EveryModule.submodule = function (config) {
  config || (config = {});
  var SuperClass = this;
  var SubClass = function () {
    SuperClass.call(this);
    config.init.apply(this, arguments);

    // Register event handlers
    for (var event in config.on) {
      this.on(event, config.on[event].bind(this));
    }
  };

  SubClass.prototype.__proto__ = SuperClass.prototype;

  // Setup chainable setters
  config.setters.split(' ').forEach( function (name) {
    SubClass.prototype[name] = function (setTo) {
      this['_' + name] = setTo;
      this.emit('set.' + name, setTo);
      return this;
    };
  });

  return SubClass;
};

/**
 * Decorates the app with the routes required of the module.
 */
EveryModule.prototype.routeApp = function (app) {
  this.emit('routeApp');
  for (var method in this.routes) {
    for (var route in this.routes[method]) {
      app[method](route, this.routes[method][route]);
    }
  }
};

var everyModule = module.exports = new EventEmitter();

everyModule.routes = { get: {}, post: {} };

everyModule.get = function (path, callback) {
  this.routes.get[path] = callback;
  return this;
};

everyModule.post = function (path, callback) {
  this.routes.post[path] = callback;
  return this;
};

/**
 * Decorates the app with the routes required of the module.
 */
everyModule.routeApp = function (app) {
  this.emit('routeApp');
  for (var method in this.routes) {
    for (var route in this.routes[method]) {
      app[method](route, this.routes[method][route]);
    }
  }
};

everyModule.submodule = function (config) {
  config || (config = {});
  var submodule = Object.create(this);
  
  // Copy over things for which we don't want prototype chain lookups
  submodule.routes = clone(this.routes);

  for (var event in config.on) {
    submodule.on(event, config.on[event].bind(submodule));
  }

  config.setters.split(' ').forEach( function (name) {
    submodule[name] = function (setTo) {
      this['_' + name] = setTo;
      this.emit('set.' + name, setTo);
      return this;
    };
  });

  return submodule;
};
