var OAuth = require('oauth').OAuth2
  , url = require('url')
  , MaterializedSequence = require('./sequence')
  , clone = require('./utils').clone;

function route (method) {
  return function (alias) {
    this._routes[method][alias];
    this.configurable(alias);
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
    }
  , get: route('get')
  , post: route('post')
  , configurable: function (property) {
      if (property.indexOf(' ') !== -1) {
        // e.g., property === 'apiHost appId appSecret'
        var self = this;
        property.split(/\s+/).forEach( function (_property) {
          self.configurable(_property);
        });
        return this;
      }

      // Else we have a single property name
      if (!this[property])
        this[property] = function (setTo) {
          var k = '_' + property;
          if (!arguments.length) return this[k];
          this[k] = setTo;
          return this;
        };
      return this;
    }
  , step: function (name, opts) {
      // TODO Use opts (e.g., for ordering information {before: 'otherStepName'})
      var steps = this._steps;
      if (!steps[name]) {
        steps[name] = {};
        steps._order.push(name);

        // For configuring what the actual business
        // logic is:
        // fb.step('fetchOAuthUser') generates the method
        // fb.fetchOAuthUser that can be used like
        // fb.fetchOAuthUser( function (...) {
        //   // Business logic goes here
        // } );
        this.configurable(name);
      }
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

    /**
     * Creates a new submodule using prototypal 
     * inheritance
     */
  , submodule: function (name) {
      var submodule = Object.create(this)
        , self = this;
      ['_routes', '_steps'].forEach(
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
      for (var method in this._routes) {
        for (var routeAlias in this._routes[method]) {
          app[method](this[routeAlias](), this.routeHandler(method, routeAlias));
        }
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
  , _routes: {
        get: {}
      , post: {}
    }
}.configurable('init');

everyModule
  .step('findOrCreateUser');
