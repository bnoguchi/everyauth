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
    this._routes[method][alias] = new MaterializedSequence(this);
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
            if (!arguments.length) {
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
      }
      return this;
    }
  , step: function (name) {
      var steps = this._steps
        , routes = this._routes
        , currRoute = this._currentRoute
        , sequence = routes[currRoute[0]][currRoute[1]];
      if (!currRoute)
        throw new Error("You can only declare a step after declaring a route alias via `get(...)` or `post(...)`.");
      sequence.orderedStepNames.push(name);
      if (!steps[name]) steps[name] = {name: name};

      // For configuring what the actual business
      // logic is:
      // fb.step('fetchOAuthUser') generates the method
      // fb.fetchOAuthUser that can be used like
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

    /**
     * Creates a new submodule using prototypal 
     * inheritance
     */
  , submodule: function (name) {
      var submodule = Object.create(this)
        , self = this;
      this.cloneOnSubmodule.forEach(
        function (toClone) {
          submodule[toClone] = clone(self[toClone]);
        }
      );
      submodule._routes = {post: {}, get: {}};
      for (var method in this._routes) {
        for (var alias in this._routes[method]) {
          var seq = new MaterializedSequence(submodule);
          seq.orderedStepNames = clone(this._routes[method][alias].orderedStepNames);
          submodule._routes[method][alias] = seq;
        }
      }
      submodule.name = name;
      return submodule;
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
    // This is also where a lot of the magic happens
  , routeHandler: function (method, routeAlias) {
      var seq = this._routes[method][routeAlias];

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

everyModule.configurable({
    moduleTimeout: 'how long to wait per step ' +
      'before timing out and invoking any ' + 
      'timeout callbacks'
});

everyModule.moduleTimeout(4000);

//everyModule.configurable({
//    init: 'An initialization method invoked after configuration but just ' + 
//          'before getting loaded to run with your app.'
//});
