var Promise = require('./promise');

function MaterializedSequence (module, steps) {
  this.module = module;
  // Our sequence state is encapsulated in seq.values
  this.values = {};
  this.steps = steps;
}

MaterializedSequence.prototype = {
    routeHandler: function () {
      this.checkSteps();
      var seq = this
        , steps = this.steps
        , firstStep = steps[0];

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

        seq.start(); // BOOM!
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
        , block = this.module[step.name]()
        , seq = this;

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
        // TODO Have a global errback that is configured
        //      instead of using this one.
        ret.errback( function (err) {
          throw err;
        });
      }

      var seq = this;
      ret.callback( function () {
        // Store the returned values
        // in the sequence's state via seq.values
        var returned = arguments
          , vals = seq.values;
        if (promises !== null) promises.forEach( function (valName, i) {
          vals[valName] = returned[i];
        });
      });

      ret.timeback( function () {
        ret.fail(new Error('Step ' + step.name + ' timed out.'));
      });

      ret.timeout(4000); // TODO Make this configurable

      return ret;
    }
  , _bind: function (priorPromise, step) {
      var nextPromise = new Promise()
        , seq = this;
      // TODO Have a global errback that is configured
      //      instead of using this one.
      nextPromise.errback( function (err) {
        throw err;
      });
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
        priorStepPromise = this._bind(priorStepPromise, steps[i]);
      }
      return priorStepPromise;
    }
  , checkSteps: function () {
      var steps = this.steps
        , step
        , paramsToDate = []
        , missingParams;
      for (var i = 0, l = steps.length; i < l; i++) {
        step = steps[i];
        if ('undefined' === typeof step.accepts)
          throw new Error('You did not declare accepts for the step: ' + step.name);
        if ('undefined' === typeof step.promises) {
          throw new Error('You did not declare promises for the step: ' + step.name);
        }

        if (i === 0) 
          paramsToDate = paramsToDate.concat(step.accepts);

        missingParams = step.accepts.filter( function (param) {
          return paramsToDate.indexOf(param) === -1;
        });

        if (i > 0 && missingParams.length)
          throw new Error('At step, ' + step.name + ', you are trying to access the parameters: ' + missingParams.join(', ') + ' . However, only the following parameters have been promised from prior steps thus far: ' + paramsToDate.join(', '));
        
        paramsToDate = paramsToDate.concat(step.promises);

        if ('undefined' === typeof this.module[step.name]())
          // TODO Remove this Error, since invoking the arg to typeof (see line above)
          //      already throws an Error
          throw new Error('No one defined the function for the following step: ' + step.name);
      }
    }
};

module.exports = MaterializedSequence;
