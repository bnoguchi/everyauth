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

everyModule.GET = function (path, callback) {
  this.routes.get[path] = callback;
  return this;
};

everyModule.POST = function (path, callback) {
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
  submodule._pres = clone(this._pres);
  submodule._posts = clone(this._posts);
  if (config)
    submodule.config(config);
  return submodule;
};


everyModule.on('start', function (strategy) {
  var provider = strategy.name;

//  strategy
//    .step('findOrCreateUserStep')
//    .step('addToSessionStep')
//    .step('succeed');
//
//  strategy.defstep('findOrCreateUserStep', function (do, req, res, user, cred, info) {
//    if (req.user) return do.next(req, res, req.user, cred, info);
//    this._findUser(cred, info, function (err, foundUser) {
//      if (foundUser) {
//        return do.next(req, res, foundUser, cred, info);
//      } else {
//        strategy._createUser(cred, info, function (err, createdUser) {
//          return do.next(req, res, createdUser, cred, info);
//        });
//      }
//    });
//  });

  if (strategy._findUser && strategy._createUser) {
    strategy.hook('findOrCreateUserStep', function (next, nextnext, req, res, user, cred, info) {
      // If we already have a user via the session (assigned to req via middleware)
      if (req.user) return next(nextnext, req, res, req.user, cred, info);

      this._findUser(cred, info, function (err, foundUser) {
        // TODO if (err)
        if (foundUser) {
          return next(nextnext, req, res, foundUser, cred, info);
        } else {
          strategy._createUser(cred, info, function (err, createdUser) {
            // TODO if (err)
            return next(nextnext, req, res, createdUser, cred, info);
          });
        }
      });
    });

    if (strategy._addToSession) {
      strategy.pre('addToSessionStep', function (next, nextnext, req, res, user, cred, info) {
        strategy.findOrCreateUserStep(next, nextnext, req, res, user, cred, info);
      });
    } else {
      strategy.pre('succeed', function (next, req, res, user, cred, info) {
        var fakeNextNext = function () {};
        strategy.findOrCreateUserStep(next, fakeNextNext, req, res, user, cred, info);
      });
    }
  }

  if (strategy._addToSession) {
    strategy.hook('addToSessionStep', function (next, req, res, user, cred, info) {
      strategy._addToSession(req.session, user, cred, info);
      next();
    });
    strategy.pre('succeed', function (next, req, res, user, cred, info) {
      strategy.addToSessionStep(next, req, res, user, cred, info);
    });
  }

  ['succeed', 'fail'].forEach( function (method) {
    if (strategy.everyauth[method]) {
      // After each strategy executes its succeed hook, call 
      // everyauth's global succeed hook
      strategy.post(method, function (next, req, res, user, cred, info) {
        strategy.everyauth[method](req, res, provider, user, cred, info);
        return next();
      });
    }
  });
});

everyModule.setters('findUser createUser addToSession');
