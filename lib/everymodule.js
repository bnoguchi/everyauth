var url = require('url')
  , MaterializedSequence = require('./sequence')
  , clone = require('./utils').clone;

var routeDescPrefix = {
    get: 'ROUTE (GET)'
  , post: 'ROUTE (POST)'
};
routeDescPrefix.GET = routeDescPrefix.get;
routeDescPrefix.POST = routeDescPrefix.post;

function route (method) {
  return function (alias, description) {
    // Clear state
    this._currentCondition = null;

    var conds2seqs = this._routes[method][alias] = {}; // maps conditions to sequences
    Object.defineProperty(conds2seqs, 'conditions', {
        value: ['defaultCondition'] // list of condition aliases
      , enumerable: false
      , writable: true
    });
    this.configurable('defaultCondition', 'do not alter this');

    if (description)
      description = routeDescPrefix[method] + ' - ' + description;
    this.configurable(alias, description);
    this._currentRoute = [method, alias];
    return this;
  };
}

var everyModule = module.exports = {
    name: 'everymodule'
  , definit: function (fn) {
      // Remove any prior `init` that was assigned
      // directly to the object via definit and not
      // assigned via prototypal inheritance
      if (this.hasOwnProperty('init'))
        delete this.init;

      var super = this.init;
      // since this.hasOwnProperty('init') is false

      this.init = function () {
        this.super = super;
        fn.apply(this, arguments);
        delete this.super;

        // Do module compilation here, too
      };
      return this;
    }
  , get: route('get')
  , post: route('post')
  , if: function (conditionAlias) {
      this._currentCondition = conditionAlias;

      var currRoute = this._currentRoute;
      var currAlias = this._routes[currRoute[0]][currRoute[1]];
      var conditions = currAlias.conditions;

      // Just in case we are re-opening a condition
      if (~conditions.indexOf(conditionAlias)) return this;

      conditions.splice(1, 0, conditionAlias);
      this.configurable(conditionAlias);
      return this;
    }
  , configurable: function (arg, description, wrapper) {
      if (!arguments.length)
        return this._configurable;
      var property;
      if (arg.constructor === Object) {
        for (property in arg) {
          description = arg[property];
          this.configurable(property, description);
        }
      } else if (typeof arg === 'string') {
        property = arg;
        if (property.indexOf(' ') !== -1) {
          // e.g., property === 'apiHost appId appSecret'
          var self = this;
          property.split(/\s+/).forEach( function (_property) {
            self.configurable(_property);
          });
          return this;
        }

        // Else we have a single property name
        // (Base Case)
        if (!this[property])
          this[property] = function (setTo) {
            var k = '_' + property;
            if (!arguments.length) {
              // TODO this.everyauth is not yet available here in some contexts
              //      For example, when we set and try to access a scope in an auth module definition
              //      but if you look in index, everyauth is not assigned to the module until after it is
              //      required
              if (this.everyauth.debug && 'undefined' === typeof this[k]) {
                var debugErr = new Error('You are trying to access the attribute/method configured by `' + property + '`, which you did not configure. Time to configure it.');
                console.log(debugErr.stack);
              }
              return this[k];
            }
            this[k] = setTo;
            return this;
          };
        this._configurable[property] = description || 
                                       this.configurable[property] || 
                                       'No Description';

        // Add configurable to submodules that inherit from this
        // supermodule
        for (var name in this.submodules) {
          this.submodules[name].configurable(arg, description);
        }
      }
      return this;
    }
  , step: function (name) {
      var steps = this._steps
        , routes = this._routes
        , currRoute = this._currentRoute
        , condition = this._currentCondition || 'defaultCondition';

      var sequence =
        routes[currRoute[0]][currRoute[1]][condition] || 
        // Lazy instantiation (vs instantiation in this.get(...) or this.post(...)
        (routes[currRoute[0]][currRoute[1]][condition] = new MaterializedSequence(this));

      if (!currRoute)
        throw new Error("You can only declare a step after declaring a route alias via `get(...)` or `post(...)`.");
      sequence.orderedStepNames.push(name);
      if (!steps[name]) steps[name] = {name: name};

      // For configuring what the actual business
      // logic is:
      // fb.step('fetchOAuthUser') generates the method
      // fb.fetchOAuthUser whose logic can be configured like
      // fb.fetchOAuthUser( function (...) {
      //   // Business logic goes here
      // } );
      this.configurable(name, 
        'STEP FN [' + name + '] function encapsulating the logic for the step `' + name + '`.');
      this._currentStep = steps[name];
      return this;
    }
  , accepts: function (input) {
      var step = this._currentStep;
      step.accepts = input
                   ? input.split(/\s+/)
                   : null;
      return this;
    }
  , promises: function (output) {
      var step = this._currentStep;
      step.promises = output
                    ? output.split(/\s+/)
                    : null;
      return this;
    }
  , description: function (desc) {
      var step = this._currentStep;
      step.description = desc;
      if (desc)
        desc = 'STEP FN [' + step.name + '] - ' + desc;
      this.configurable(step.name, desc);
      return this;
    }
  , stepTimeout: function (millis) {
      var step = this._currentStep;
      step.timeout = millis;
      return this;
    }

  , cloneOnSubmodule: ['cloneOnSubmodule', '_steps', '_configurable']
  
  , submodules: {}

    /**
     * Creates a new submodule using prototypal 
     * inheritance
     */
  , submodule: function (name) {
      var submodule = Object.create(this)
        , self = this;

      // So that when we add configurables after
      // to the supermodule after the submodule
      // creation, we can propagate those configurables
      // to the supermodule's submodules
      this.submodules[name] = submodule;
      submodule.submodules = {};

      this.cloneOnSubmodule.forEach(
        function (toClone) {
          submodule[toClone] = clone(self[toClone]);
        }
      );
      submodule._routes = {post: {}, get: {}};
      for (var method in this._routes) {
        for (var alias in this._routes[method]) {
          submodule._routes[method][alias] = {};
          for (var condition in this._routes[method][alias]) {
            var seq = this._routes[method][alias][condition].clone(submodule);
            submodule._routes[method][alias][condition] = seq;
            Object.defineProperty(submodule._routes[method][alias], 'conditions', {
                value: clone(this._routes[method][alias].conditions)
              , enumerable: false
              , writable: true
            });
          }
        }
      }
      submodule.name = name;
      return submodule;
    }

  , validateSteps: function () {
      for (var method in this._routes) {
        for (var routeAlias in this._routes[method]) {
          for (var conditionAlias in this._routes[method][routeAlias]) {
            this._routes[method][routeAlias][conditionAlias].checkSteps();
          }
        }
      }
    }

    /**
     * Decorates the app with the routes required of the 
     * module
     */
  , routeApp: function (app) {
      if (this.init) this.init();
      for (var method in this._routes) {
        for (var routeAlias in this._routes[method]) {
          var path = this[routeAlias]();
          if (!path)
            throw new Error('You have not defined a path for the route alias ' + routeAlias + '.');
          app[method](path, this.routeHandler(method, routeAlias));
        }
      }
    }

    // Returns the route handler
    // This is also where a lot of the magic happens (See ./sequence.js)
  , routeHandler: function (method, routeAlias) {
      var route = this._routes[method][routeAlias]
        , conditions = route.conditions
        , self = this;

      return function (req, res) {
        var condition, conditionLambda;
        var i = conditions.length;
        while (i--) {
          condition = conditions[i];
          conditionLambda = self[condition]();
          if (conditionLambda.call(self, req, res))
            break;
        }
        var seq = route[condition];
        if (!seq) {
          throw new Error("None of your conditions passed for route " + method.toUpperCase() + ' ' + routeAlias);
        }
        seq.routeHandler.call(seq, req, res);
      };

      return seq.routeHandler();
      // This kicks off a sequence of steps based on a
      // route
      // Creates a new chain of promises and exposes the leading promise
      // to the incoming (req, res) pair from the route handler
    }

    // _steps maps step names to step objects
    // A step object is { accepts: [...], promises: [...] }
  , _steps: {}

    // _routes maps http methods (get, post) to route aliases to
    // sequence instances.
  , _routes: {
        get: {}
      , post: {}
    }

    // _configurable maps parameter names to descriptions
    // It is used for introspection with this.configurable()
  , _configurable: {}
};

Object.defineProperty(everyModule, 'routes', {get: function () {
  var arr = []
    , _routes = this._routes
    , _descriptions = this._configurable
    , aliases
    , self = this;
  for (var method in _routes) {
    for (var alias in _routes[method]) {
      method = method.toUpperCase();
      arr.push(method + ' (' + alias + ') [' +
        self[alias]() + ']' + 
        _descriptions[alias].replace(routeDescPrefix[method], ''));
    }
  }
  return arr;
}});

Object.defineProperty(everyModule, 'route', {
  get: function () {
    return this._routes;
  }
});

everyModule
  .configurable({
      moduleTimeout: 'how long to wait per step ' +
        'before timing out and invoking any ' + 
        'timeout callbacks'
    , logoutRedirectPath: 'where to redirect the app upon logging out'
    , findUserById: 'function for fetching a user by his/her id -- used to assign to `req.user` - function (userId, callback) where function callback (err, user)'
  })
  .get('logoutPath')
    .step('handleLogout')
      .accepts('req res')
      .promises(null)
  .logoutPath('/logout')
  .handleLogout( function (req, res) {
    req.logout();
    res.writeHead(303, { 'Location': this.logoutRedirectPath() });
    res.end();
  })
  .logoutRedirectPath('/');

everyModule.moduleTimeout(4000);

everyModule.defaultCondition( function () {
  return true;
});
