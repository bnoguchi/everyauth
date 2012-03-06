var url = require('url')
  , Step = require('../step')
  , StepSequence = require('../stepSequence')
  , RouteTriggeredSequence = require('../routeTriggeredSequence')
  , clone = require('../utils').clone
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

        // Do module compilation here, too
      };
      return this;
    }

  , _stepSequences: {}
  , stepseq: function stepseq (name, description) {
      this.configurable(name, description);
      this._currSeq =
        this._stepSequences[name] || (this._stepSequences[name] = new StepSequence(name, this));
      return this;
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
          return this;
        }
        // TODO this.everyauth is not yet available here in some contexts
        //      For example, when we set and try to access a scope in an auth module definition
        //      but if you look in index, everyauth is not assigned to the module until after it is
        //      required
        if (this.everyauth && this.everyauth.debug && 'undefined' === typeof this[k]) {
          var debugMsg = 'WARNING: You are trying to access the attribute/method configured by `' +
                         property + '`, which you did not configure. Time to configure it.';
          console.log(debugMsg);
          console.trace();
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

    // TODO Move `.step(name)` behind StepSequence.prototype
  , step: function (name) {
      var steps = this._steps
        , sequence = this._currSeq;

      if (!sequence)
        throw new Error("You can only declare a step after declaring a route alias via `get(...)` or `post(...)`.");

      sequence.orderedStepNames.push(name);

      this._currentStep =
        steps[name] || (steps[name] = new Step(name, this));

      // For configuring what the actual business
      // logic is:
      // fb.step('fetchOAuthUser') generates the method
      // fb.fetchOAuthUser whose logic can be configured like
      // fb.fetchOAuthUser( function (...) {
      //   // Business logic goes here
      // } );
      this.configurable(name, 
        'STEP FN [' + name + '] function encapsulating the logic for the step `' + name + '`.');
      return this;
    }

  , accepts: function (input) {
      this._currentStep.accepts = input && input.split(/\s+/) || null;
      return this;
    }

  , promises: function (output) {
      this._currentStep.promises = output && output.split(/\s+/) || null;
      return this;
    }

  , description: function (desc) {
      var step = this._currentStep;
      step.description = desc;
      if (desc) desc = 'STEP FN [' + step.name + '] - ' + desc;
      this.configurable(step.name, desc);
      return this;
    }

  , stepTimeout: function (millis) {
      this._currentStep.timeout = millis;
      return this;
    }

  , stepErrback: function (fn) {
      this._currentStep.errback = fn;
      return this;
    }

  , canBreakTo: function (sequenceName) {
      // TODO Implement this (like static typing)
      //      unless `canBreakTo` only needed for
      //      readability
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
          });

      this.cloneOnSubmodule.forEach( function (toClone) {
        submodule[toClone] = clone(self[toClone]);
      });

      var seqs = this._stepSequences
        , newSeqs = submodule._stepSequences = {};
      for (var seqName in seqs) {
        newSeqs[seqName] = seqs[seqName].clone(submodule);
      }

      var steps = this._steps
        , newSteps = submodule._steps = {};
      for (var stepName in steps) {
        newSteps[stepName] = steps[stepName].clone(stepName, submodule);
      }

      return submodule;
    }

  , validateSequences: function () {
      var seqs = this._stepSequences;
      for (var seqName in seqs)
        seqs[seqName].validateSteps();
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
          app[method](path, seq.routeHandler.bind(seq));
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

    // _steps maps step names to step objects
    // A step object is { accepts: [...], promises: [...] }
  , _steps: {}

  , redirect: function (req, location) {
      this._performRedirect(req, location);
    }
};

everyModule.get = route('get');
everyModule.post = route('post');

/**
 * Returns a function used for declaring new route triggered sequences
 * associated with the uri route and the http `method`
 * @param {String} httpMethod (e.g, 'get', 'post')
 */
function route (httpMethod) {
  return function (alias, description) { /* `this` is `everyModule` */
    if (description)
      description = routeDescPrefix[httpMethod.toLowerCase()] + ' - ' + description;
    this.configurable(alias, description);
    var name = httpMethod + ':' + alias;
    this._currSeq =
      this._stepSequences[name] || (this._stepSequences[name] = new RouteTriggeredSequence(name, this));
    return this;
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
