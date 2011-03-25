var EventEmitter = require('events').EventEmitter
  , OAuth = require('oauth').OAuth2
  , url = require('url')
  , hooks = require('hooks')
  , clone = require('./utils').clone;

var everyModule = module.exports = new EventEmitter();

for (var k in hooks) {
  everyModule[k] = hooks[k];
}

everyModule.routes = { get: {}, post: {} };

everyModule.get = function (path, callback) {
  this.routes.get[path] = callback;
  return this;
};

everyModule.post = function (path, callback) {
  this.routes.post[path] = callback;
  return this;
};

everyModule.setters = function (names) {
  var self = this;
  names && names.split(' ').forEach( function (name) {
    self[name] = function (setTo) {
      this['_' + name] = setTo;
      this.emit('set.' + name, this, setTo);
      return this;
    };
  });
  return this;
};

everyModule._events_ = {};
var oldOn = EventEmitter.prototype.on;
everyModule.on = function (event, callback) {
  if (arguments.length === 1 && event.constructor === Object) {
    for (var ev in event) {
      oldOn.call(this, ev, event[ev]);
    }
  } else {
    oldOn.call(this, event, callback);
  }
  return this;
};

// So we can add pre and post to the succeed hook
everyModule.hook('succeed', function (req, res, uid, cred, info) {});

everyModule.config = function (config) {
  config || (config = {});
  for (var k in config) {
    if ('function' !== typeof this[k]) {
      throw new Error('config key, ' + k + ', does not match any '
                      + 'of the current module methods');
    }
    this[k](config[k]);
  }
  return this;
};

/**
 * Decorates the app with the routes required of the module.
 */
everyModule.routeApp = function (app) {
  this.emit('routeApp', this);
  for (var method in this.routes) {
    for (var route in this.routes[method]) {
      app[method](route, this.routes[method][route]);
    }
  }
};

/**
 * Creates a submodule based on the current module.
 */
everyModule.submodule = function (config) {
  var submodule = Object.create(this);
  // Copy over things for which we don't want prototype chain lookups
  submodule.routes = clone(this.routes);
  submodule._events = clone(this._events);
  if (config)
    submodule.config(config);
  return submodule;
};

