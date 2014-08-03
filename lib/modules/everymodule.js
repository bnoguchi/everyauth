var StepSequence = require('../stepSequence2');
var clone = require('../utils').clone;
var Promise = require('../promise');
var EventEmitter = require('events').EventEmitter;

/**
 * Instances of EveryModule is the root ancestor of all other modules used for
 * auth.
 * This interface makes it easy to create configurable, chainable modules, with
 * submodules that inherit from parent modules.
 * The interface also allows declarative flow control of a sequence of steps.
 */
function EveryModule (everyauth) {
  EventEmitter.call(this);

  this.everyauth = everyauth;

  this._stepSequences = {};

  // _configurable maps parameter names to descriptions
  // It is used for introspection with this.configurable()
  this._configurable = {};

  this.submodules = {};

  this._middleware = {};

  this.didSetup = false;

  this
    .configurable({
        moduleTimeout: 'How long to wait per step before timing out and invoking any timeout callbacks'
      , moduleErrback: 'THE error callback that is invoked any time an error occurs in the module; ' +
          'defaults to passing the error to connect/express `next` callback'
      , findUserById: 'function for fetching a user by his/her id -- used to assign to `req.user` - function ( [req], userId, callback) where function callback (err, user)'
      , performRedirect: 'function for redirecting responses'
      , userPkey: 'identifying property of the user; defaults to "id"'
    })
    .userPkey('id');

  this.performRedirect( function(res, location) {
    res.writeHead(303, { 'Location': location });
    res.end();
  });

  this.moduleTimeout(10000);
  this.moduleErrback( function (err, seqValues) {
    if (! (err instanceof Error)) {
      console.log('Warning: Try to pass only Errors');
      err = new Error(JSON.stringify(err));
    }
    var next = seqValues.next;
    next(err);
  });
}

require('util').inherits(EveryModule, EventEmitter);

EveryModule.prototype.name = 'everymodule';

EveryModule.prototype.configurable = function (arg, description) {
  // Support function signature:
  //   module.configurable()
  // Return a listing of the module's configuration
  if (!arguments.length) return this._configurable;

  var property;

  if (arg.constructor == Object) {
    for (property in arg) {
      description = arg[property];
      this.configurable(property, description);
    }
    return this;
  }

  console.assert('string' === typeof arg);

  property = arg;

  // Support function signature:
  //   module.configurable(paramName);
  // Returns the configurable param description
  if (arguments.length === 1 && this[property]) {
    return this._configurable[property];
  }

  // Support function signature:
  //     module.configurable('someParam', 'description');

  // Declaring a configurable property creates some getter and setter methods
  // on the module automatically:
  //     module.configurable('someParam', 'description');
  //     module.someParam('xyz');
  //     module.someParams(); // => 'xyz'
  this[property] = function (setTo) {
    var k = '_' + property;
    if (arguments.length) {
      this[k] = setTo;
      return this;
    }
    // TODO this.everyauth is not yet available here in some contexts
    //      For example, when we set and try to access a scope in an auth module definition
    //      but if you look in index, everyauth is not assigned to the module until after it is
    //      required
    if ('undefined' === typeof this[k]) {
      console.log(this, "\n\n", k);
      var debugMsg = 'WARNING: You are trying to access the attribute/method configured by `' +
                     property + '`, which you did not configure. Time to configure it.';
      throw new Error(debugMsg);
    }
    return this[k];
  };

  this._configurable[property] = description || 'No Description';

  // Add configurable to submodules that inherit from this supermodule
  for (var name in this.submodules) {
    this.submodules[name].configurable(property, description);
  }
  return this;
};

/**
 * Convenience method for all you coffee-script lovers, e.g.,
 *
 * everyauth.dropbox.configure
 *   consumerKey:       conf.dropbox.consumerKey
 *   consumerSecret:    conf.dropbox.consumerSecret
 *   findOrCreateUser:  (sess, accessToken, accessSecret, dbMeta) -> users[dbMeta.uid] or= addUser('dropbox', dbMeta)
 *   redirectPath:      '/'
 */
EveryModule.prototype.configure = function (conf) {
  for (var k in conf) {
    this[k](conf[k]);
  }
  return this;
};

EveryModule.prototype.stepseq = function (name, description) {
  var seqs = this._stepSequences;
  if (seqs[name]) return seqs[name];

  this.configurable(name, description);
  this._currSeq = seqs[name] || (seqs[name] = new StepSequence(name, this.everyauth.debug));
  return this;
};

// TODO Move `.step(name)` behind StepSequence.prototype
EveryModule.prototype.step = function (name) {
  var sequence = this._currSeq;

  if (!sequence) {
    throw new Error("You can only declare a step after declaring a route alias via `get(...)` or `post(...)`.");
  }

  if (this[name]) {
    throw new Error('Cannot name this step, ' + name + ', because it is already reserved by a configurable parameter of the same name.');
  }

  // For configuring what the actual business
  // logic is:
  // fb.step('fetchOAuthUser') generates the method
  // fb.fetchOAuthUser whose logic can be configured like
  // fb.fetchOAuthUser( function (...) {
  //   // Business logic goes here
  // } );
  this.configurable(name,
    'STEP FN [' + name + '] function encapsulating the logic for the step `' + name + '`.');

  sequence.step(name);

  return this;
};

EveryModule.prototype.accepts = function (input) {
  this._currSeq.accepts(input);
  return this;
};

EveryModule.prototype.promises = function (output) {
  this._currSeq.promises(output);
  return this;
};

EveryModule.prototype.description = function (desc) {
  this._currSeq.description(desc);
  return this;
};

EveryModule.prototype.stepTimeout = function (millis) {
  this._currentStep.timeout = millis;
  return this;
};

EveryModule.prototype.stepErrback = function (fn) {
  this._currentStep.errback = fn;
  return this;
};

EveryModule.prototype.cloneOnSubmodule = [
  'cloneOnSubmodule'
, '_configurable'
];

// Creates a new submodule using prototypal inheritance
EveryModule.prototype.submodule = function (name) {
  // We need to be able to access submodules from a parent module, so that when
  // the parent modules adds configurables -- but after the submodule creation
  // -- we can propagae those configurables to the supermodule's submodules.
  var submodule = this.submodules[name] = Object.create(this, {
      name: { value: name }
    , submodules: { value: {} }
    , _middleware: { value: {} }
  });

  var parentModule = this;
  this.cloneOnSubmodule.forEach( function (toClone) {
    submodule[toClone] = clone(parentModule[toClone]);
  });

  var seqs = this._stepSequences;
  var newSeqs = submodule._stepSequences = {};
  for (var seqName in seqs) {
    newSeqs[seqName] = seqs[seqName].clone(submodule);
  }

  // Inherit 'setup' listeners
  var listeners = this.listeners('setup');
  for (var i = 0, l = listeners.length; i < l; i++) {
    this.once('setup', listeners[i]);
  }

  submodule.once('setup', function () {
    if (! submodule.shouldValidate()) return;
    var err = submodule.validate();
    if (err) throw err;
  });

  return submodule;
};

EveryModule.prototype.validate = function () {
  // TODO Remove console.log
  var seqs = this._stepSequences;
  for (var seqName in seqs) {
    var err = seqs[seqName].validate();
    if (err) return err;
  }
};

// This is meant to be used to define promises inside a Step:
//     module.getAccessToken( function () {
//       var p = this.Promise();
//       return p;
//     })
EveryModule.prototype.Promise = function (values) {
  return arguments.length ? new Promise(values) : new Promise();
};

EveryModule.prototype.redirect = function (req, location) {
  this._performRedirect(req, location);
};

var routeDescPrefix = {
    get: 'ROUTE (GET)'
  , post: 'ROUTE (POST)'
};

['get', 'post'].forEach( function (httpMethod) {
  EveryModule.prototype[httpMethod] = function (alias, description) {
    if (description) {
      description = routeDescPrefix[httpMethod] + ' - ' + description;
    }
    this.configurable(alias, description);
    var name = httpMethod + ':' + alias;
    this._currSeq =
      this._stepSequences[name] || (this._stepSequences[name] = new StepSequence(name, this, this.everyauth.debug));
    return this;
  };
});

EveryModule.prototype.middleware = function (endpointAlias) {
  // Lazily initialize middleware. Only need to do it once for a set of
  // endpointAlias'es defined by a module.
  if (! this.didSetup) {
    this.emit('setup', this);
    this.didSetup = true;
  }
  var middleware = this._middleware[endpointAlias];
  if (middleware) return middleware;

  // function (req, res, next)
  // Invoking this kicks off a sequence of steps based on a route.
  // Creates a new chain of promises and exposes the leading promise
  // to the incoming (req, res) pair from the route handler.
  return this._middleware[endpointAlias] = this.route.get[endpointAlias];
};

// Used to determine if we should validate the module's sequences and setup the
// module's routes. If a module is strictly used as a parent or ancestor module
// to define a shared interface for submodules, then, this should be false.
EveryModule.prototype.shouldValidate = function () {
  for (var _ in this.submodules) return false;
  return true;
};

Object.defineProperty(EveryModule.prototype, '_routes', { get: function () {
  var seqs = this._stepSequences
    , methods = ['get', 'post'];
  return Object.keys(seqs).filter( function (seqName) {
    return ~methods.indexOf(seqName.split(':')[0]);
  }).reduce( function (_routes, routeName) {
    var parts = routeName.split(':')
      , method = parts[0]
      , routeAlias = parts[1];
    _routes[method] || (_routes[method] = {});
    _routes[method][routeAlias] = seqs[routeName];
    return _routes;
  }, {});
}});

Object.defineProperty(EveryModule.prototype, 'route', {
  get: function () { return this._routes; }
});

Object.defineProperty(EveryModule.prototype, 'routes', {get: function () {
  var arr = []
    , _routes = this._routes
    , _descriptions = this._configurable;
  for (var method in _routes) {
    for (var alias in _routes[method]) {
      method = method.toUpperCase();
      arr.push(method + ' (' + alias + ') [' +
        this[alias]() + ']' +
        _descriptions[alias].replace(routeDescPrefix[method.toLowerCase()], ''));
    }
  }
  return arr;
}});

module.exports = EveryModule;
