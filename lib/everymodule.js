var OAuth = require('oauth').OAuth2
  , url = require('url')
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
    this._routes[method].push(alias);
    if (description)
      description = routeDescPrefix[method] ' - ' + description;
    this.configurable(alias, description);
    this._currentRoute = method + '.' + alias;
    return this;
  };
}

// TODO Add in check for missing step definitions
//      from the set of step declarations
// TODO Add introspection to list incompletely defined steps
// TODO Add in ability for step to be optional
var everyModule = module.exports = {
    definit: function (fn) {
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
  , routes: function () {
      var arr = []
        , _routes = this._routes
        , _descriptions = this._configurable
        , aliases
        , self = this;
      for (var method in _routes) {
        aliases = _routes[method]
        method = method.toUpperCase();
        arr = arr.concat( aliases.map( function (alias) {
          return method + ' (' + alias + ') [' +
            self[alias]() + ']' + 
            _descriptions[alias].replace(routeDescPrefix[method], '');
        }) );
      }
      return arr;
    }
  , configurable: function (arg, description) {
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
            if (!arguments.length) return this[k];
            this[k] = setTo;
            return this;
          };
        this._configurable[property] = description || 
                                       this.configurable[property] || 
                                       'No Description';
      }
      return this;
    }
  , step: function (name, opts) {
      // TODO Use opts (e.g., for ordering information {before: 'otherStepName'})
      var steps = this._steps
        , routeSteps = steps[this._currentRoute];
      if (!routeSteps) {
        routeSteps = steps[this._currentRoute] = {_order: []};
      }
      routeSteps._order.push(name);
      if (!routeSteps[name]) routeSteps[name] = {name: name};

      // For configuring what the actual business
      // logic is:
      // fb.step('fetchOAuthUser') generates the method
      // fb.fetchOAuthUser that can be used like
      // fb.fetchOAuthUser( function (...) {
      //   // Business logic goes here
      // } );
      this.configurable(name, 
        'STEP FN [' + name + '] function encapsulating the logic for the step `' + name + '`.');
      this._currentStep = routeSteps[name];
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

    /**
     * Creates a new submodule using prototypal 
     * inheritance
     */
  , submodule: function (name) {
      var submodule = Object.create(this)
        , self = this;
      ['_routes', '_steps', '_configurable'].forEach(
        function (toClone) {
          submodule[toClone] = clone(self[toClone]);
        }
      );
      submodule.name = name;
      return submodule;
    }

    /**
     * Decorates the app with the routes required of the 
     * module
     */
  , routeApp: function (app) {
      this.init();
      var self = this;
      for (var method in this._routes) {
        this._routes[method].forEach( function (routeAlias) {
          var path = self[routeAlias]();
          if (!path)
            throw new Error('You have not defined a path for the route alias ' + routeAlias + '.');
          app[method](path, self.routeHandler(method, routeAlias));
        });
      }
    }

    // Returns the route handler
    // This is also where a lot of the magic happens
  , routeHandler: function (method, routeAlias) {
      var stepsHash = this._steps[method + '.' + routeAlias]
          // Move orderedSteps to a getter?
        , orderedSteps = stepsHash._order.map( function (stepName) {
            return stepsHash[stepName];
          })
        , seq = new MaterializedSequence(this, orderedSteps);

      return seq.routeHandler();
      // This kicks off a sequence of steps based on a
      // route
      // Creates a new chain of promises and exposes the leading promise
      // to the incoming (req, res) pair from the route handler
    }

    // _steps maps method.routes to step names to step objects
    //  and an ordering of the step names (via `_order` key
    //  which keeps the ordered list of step names)
    // A step object is { accepts: [...], promises: [...] }
  , _steps: {}

    // This just stores the route aliases, which are pushed
    // onto _routes.get or _routes.post depending on the
    // route's method (e.g., GET or POST)
  , _routes: {
        get: []
      , post: []
    }

    // _configurable maps parameter names to descriptions
    // It is used for introspection with this.configurable()
  , _configurable: {}
};

everyModule.configurable('init User');

everyModule
  .step('findOrCreateUser');
