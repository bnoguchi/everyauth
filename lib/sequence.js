var Promise = require('./promise');

function MaterializedSequence (module, steps) {
  this.module = module;
  // Our sequence state is encapsulated in seq.values
  this.values = {};
  this.steps = steps;
}

MaterializedSequence.prototype = {
    routeHandler: function () {
      var seq = this
        , steps = this.steps
        , firstStep = steps[0];

      var promises = this.steps.map( function (step) {
        var accepts = step.accepts
          , promises = step.promises
            // TODO step.block getter?
          , block = seq.module[step.name]();
      });


      // This kicks off a sequence of steps based on a
      // route
      // Creates a new chain of promises and exposes the leading promise
      // to the incoming (req, res) pair from the route handler
      return function () {
        var args = Array.prototype.slice.call(arguments, 0);
        firstStep.accepts.forEach( function (valName, i) {
          // Map the incoming arguments to the named parameters 
          // that the first step is expected to accept.
          seq.values[valName] = args[i];
        });
        seq.start();
        
      };
    }
    /**
     * @param {Object} step
     * @returns {Promise}
     */
  , applyStep: function (step) {
      var accepts = step.accepts
        , promises = step.promises
          // TODO step.block getter?
        , block = step.module[step.name]();

      // Unwrap values based on step.accepts
      var args = accepts.reduce( function (args, accept) {
        args.push(seq.values[accept]);
        return args;
      }, []);
      // Apply the step logic
      ret = block.apply(this.module, args);

      // Convert return value into a Promise
      // if it's not yet a Promise
      if (! (ret instanceof Promise)) {
        if (Array.isArray(ret))
          ret = new Promise(ret);
        else
          ret = new Promise([ret]);
      }

      var seq = this;
      ret.callback( function () {
        // Store the returned values
        // in the sequence's state via seq.values
        var returned = arguments
          , vals = seq.values;
        promises.forEach( function (valName, i) {
          vals[valName] = returned[i];
        });
      });

      return ret;
    }
  , _bind: function (priorPromise, step) {
      var nextPromise = new Promise()
        , seq = this;
      priorPromise.callback( function () {
        seq.applyStep(step).callback( function () {
          nextPromise.fulfill();
        });
      });
      return nextPromise;
    }
  , start: function () {
      var steps = this.steps;

      // Pipe through the steps
      var priorStepPromise = this.applyStep(steps[0]);
      for (var i = 1, l = steps.length; i < l; i++) {
        priorStepPromise = bind(priorStepPromise, steps[i]);
      }
      return priorStepPromise;
    }
};

module.exports = MaterializedSequence;
