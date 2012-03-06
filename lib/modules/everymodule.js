var url = require('url')
  , EventEmitter = require('events').EventEmitter
  , debug = require('../debug')
  , Step = require('../step')
  , StepSequence = require('../stepSequence')
  , utils = require('../utils')
  , clone = utils.clone
  , delegate = utils.delegate
  , Promise = require('../promise');

var everyModule = module.exports = {
    name: 'everymodule'

  , definit: function definit (fn) {
      // Remove any prior `init` that was assigned directly to the object via
      // definit and not assigned via prototypal inheritance
      if (this.hasOwnProperty('init')) delete this.init;

      var _super = this.init;
      // since this.hasOwnProperty('init') is false

      this.init = function init () {
        this._super = _super;
        fn.apply(this, arguments);
        delete this._super;

        // TODO Do module compilation here, too
      };
      return this;
    }

  , _stepSequences: {}
  , stepseq: function stepseq (name, description) {
      var sequence;
      if (sequence = this._stepSequences[name]) return sequence;

      this.configurable(name, description);
      return this._createStepSequence(name, description, name);
    }
  , _createStepSequence: function (name, description, configParam) {
      var seqs = this._stepSequences
        , sequence = seqs[name] = new StepSequence(name, this)
        , self = this;

      function setupDelegationToModule (receiver) {
        var methodsToDelegate =
              // Expose route methods to Step and StepSequence instances
              Object.keys(routeDescPrefix)
              // Expose other methods to Step and StepSequence instances
              .concat(['stepseq']);
        for (var i = methodsToDelegate.length; i--; ) {
          delegate(receiver, methodsToDelegate[i], self);
        }
      }
      setupDelegationToModule(sequence);

      sequence.on('addStep', function (step) {
        step.on('description', function (step, desc) {
          desc = 'STEP FN [' + step.name + '] - ' + desc;
          self.configurable(step.name, desc);
        });

        if (! (configParam in step)) { // false in a shared step scenario
          delegate(step, configParam).to(self);
        }

        // For configuring what the actual business logic is:
        // fb.step('fetchOAuthUser') generates the method
        // fb.fetchOAuthUser whose logic can be configured like
        //     fb.fetchOAuthUser( function (...) {
        //       // Business logic goes here
        //     });
        if (! (step.name in self)) { // false in a shared step scenario
          self.configurable(step.name,
            'STEP FN [' + step.name + '] function encapsulating the logic for the step `' + step.name + '`.');
        }

        var configuredStepFn;
        if (configuredStepFn = self['_' + step.name]) {
          // Will occur in a shared step scenario
          step.fn(configuredStepFn);
        }
        self.on('configure:' + step.name, function (fn) {
          step.fn(fn);
        });

        // Allow us to call the configuration method that belongs to the module
        // as if it were a method of a Step or StepSequence
        for (var seqName in seqs) {
          var currSeq = seqs[seqName];
          if (! (step.name in currSeq)) { // false in a shared step scenario
            delegate(currSeq, step.name).to(self);
          }
          var steps = currSeq.steps;
          for (var i = steps.length; i--; ) {
            // Delegate a method named after the new step,
            // delegating from all steps to the module
            if (! (step.name in steps[i])) { // false in a shared step scenario
              delegate(steps[i], step.name).to(self);
            }

            // Delegate methods named after prior-defined steps,
            // delegating from the new step to the module
            if (step !== steps[i]) {
              if (! (steps[i].name in step)) {
                delegate(step, steps[i].name).to(self);
              }
            }
          }
        }
        setupDelegationToModule(step);
      });
      return sequence;
    }

    // _configurable maps parameter names to descriptions
    // It is used for introspection with this.configurable()
  , _configurable: {}
  , configurable: function configurable (arg, description) {

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
      this[property] = function (setTo) {
        var k = '_' + property;
        if (arguments.length) {
          this[k] = setTo;
          this.emit('configure:' + property, setTo);
          return this;
        }
        if ('undefined' === typeof this[k]) {
          debug('WARNING: You are trying to access the attribute/method configured ' +
            'by `' + property + "`, which you didn't configure. Time to configure it."
          );
        }
        return this[k];
      };

      this._configurable[property] = description || 'No Description';

      // Add configurable to submodules that inherit from this supermodule
      for (var name in this.submodules) {
        this.submodules[name].configurable(arg, description);
      }
      return this;
    }

  , cloneOnSubmodule: ['cloneOnSubmodule', '_configurable']

  , submodules: {}

    // Creates a new submodule using prototypal inheritance
  , submodule: function (name) {
      var self = this
          // So that when we add configurables after
          // to the supermodule after the submodule
          // creation, we can propagate those configurables
          // to the supermodule's submodules
        , submodule = this.submodules[name] = Object.create(this, {
              name: { value: name }
            , submodules: { value: {} }
              // Create new EventEmitter instance variables
            , _events: { value: {} }
          });

      this.cloneOnSubmodule.forEach( function (toClone) {
        submodule[toClone] = clone(self[toClone]);
      });

      var seqs = this._stepSequences
        , newSeqs = submodule._stepSequences = {};
      for (var seqName in seqs) {
        newSeqs[seqName] = seqs[seqName].clone(submodule);
      }

      return submodule;
    }

  , validateSequences: function () {
      var seqs = this._stepSequences;
      for (var name in seqs) {
        seqs[name].validateSteps();
      }
    }

    // Decorates the app with the routes required of the module
  , routeApp: function (app) {
      if (this.init) this.init();
      var routes = this._routes
        , methods = ['get', 'post'];
      for (var method in routes) {
        for (var routeAlias in routes[method]) {
          var path = this[routeAlias]();
          if (!path)
            throw new Error('You have not defined a path for the route alias ' + routeAlias + '.');
          var seq = routes[method][routeAlias];

          // This kicks off a sequence of steps based on a route
          // Creates a new chain of promises and exposes the leading promise
          // to the incoming (req, res) pair from the route handler
          app[method](path, (function (seq) {
            return function () {
              seq.start.apply(seq, arguments);
            };
          })(seq));
        }
      }
    }

  , Promise: function (values) {
      return new Promise(this, values);
    }

    /**
     * Function signature:
     *   breakTo(sequenceName, arg1, arg2, ...);
     *
     * [arg1, arg2, ...] are the arguments passed to the `sequence.start(...)`
     * where sequence is the sequence with the name `sequenceName`
     */
  , breakTo: function (sequenceName) {
      // TODO Garbage collect the abandoned sequence
      var seq = this._stepSequences[sequenceName]
        , args = Array.prototype.slice.call(arguments, 1);
      if (!seq) {
        throw new Error('You are trying to break to a sequence named `' + sequenceName + '`, but there is no sequence with that name in the auth module, `' + this.name + '`.');
      }
      seq = seq.materialize();
      seq.initialArgs = args;
      throw seq;
    }

  , redirect: function (req, location) {
      this._performRedirect(req, location);
    }
};

// Inherit from EventEmitter
EventEmitter.call(everyModule);
everyModule.__proto__ = EventEmitter.prototype;

everyModule.get = route('get');
everyModule.post = route('post');

/**
 * Returns a function used for declaring new route triggered sequences
 * associated with the uri route and the http `method`
 * @param {String} httpMethod (e.g, 'get', 'post')
 */
function route (httpMethod) {
  return function (alias, description) { /* `this` is `everyModule` */
    var name = httpMethod + ':' + alias
      , sequence;
    if (sequence = this._stepSequences[name]) return sequence;

    if (description)
      description = routeDescPrefix[httpMethod.toLowerCase()] + ' - ' + description;
    this.configurable(alias, description);
    return this._createStepSequence(httpMethod + ':' + alias, description, alias);
  };
}

var routeDescPrefix = {
    get: 'ROUTE (GET)'
  , post: 'ROUTE (POST)'
};

// Used to determine if we should validate the module's sequences and setup the
// module's routes. If a module is strictly used as a parent or ancestor module
// to define a shared interface for submodules, then, this should be false.
Object.defineProperty(everyModule, 'shouldSetup', { get: function () {
  return ! Object.keys(this.submodules).length;
}});

Object.defineProperty(everyModule, '_routes', { get: function () {
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

Object.defineProperty(everyModule, 'route', {
  get: function () { return this._routes; }
});

Object.defineProperty(everyModule, 'routes', {get: function () {
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

everyModule
  .configurable({
      moduleTimeout: 'How long to wait per step before timing out and invoking any timeout callbacks'
    , moduleErrback: 'THE error callback that is invoked any time an error occurs in the module; ' +
        'defaults to `throw` wrapper'
    , logoutRedirectPath: 'Where to redirect the app upon logging out'
    , findUserById: 'function for fetching a user by his/her id -- used to assign to `req.user` - function (userId, callback) where function callback (err, user)'
    , performRedirect: 'function for redirecting responses'
  })
  .get('logoutPath')
    .step('handleLogout')
      .accepts('req res')
      .promises(null)
  .logoutPath('/logout')
  .handleLogout( function (req, res) {
    req.logout();
    this.redirect(res, this.logoutRedirectPath());
  })
  .logoutRedirectPath('/');

everyModule.performRedirect( function(res, location) {
  res.writeHead(303, { 'Location': location });
  res.end();
});

everyModule.moduleTimeout(10000);
everyModule.moduleErrback( function (err) {
  if (! (err instanceof Error)) {
    console.log('Warning: Try to pass only Errors');
    err = new Error(JSON.stringify(err));
  }
  throw err;
});
