var Promise = require('./promise')
  , EventEmitter = require('events').EventEmitter
  , Step = require('./step')

function StepSequence (name, module) {
  EventEmitter.call(this);
  this.name = name;
  this.module = module;

  // _steps maps step names to step objects
  // A step object is { accepts: [...], promises: [...] }
  this._steps = {};
  this._orderedStepNames = [];
}

StepSequence.prototype.__proto__ = EventEmitter.prototype;

StepSequence.prototype.constructor = StepSequence;

StepSequence.prototype.step = function step (name) {
  var step
    , allSteps = this._steps;
  if ('string' === typeof name) {
    if (step = allSteps[name]) return step;

    step = allSteps[name] = new Step(name, this);
  } else {
    // Otherwise name instanceof Step
    var incomingStep = name
      , name = incomingStep.name;
    step = allSteps[name];
    if (step && (step !== incomingStep)) {
      console.warn('Step ' + name + ' is about to be over-written. Make sure this is what you want.');
    }
    if (step) return step;

    step = allSteps[name] = Object.create(incomingStep, {
        sequence: { value: this }

        // Create new EventEmitter instance variables
      , _events: { value: {} }
    });
  }

  this._orderedStepNames.push(step.name);
  this.emit('addStep', step);
  return step;
};

/**
 * Sets up the immediate or eventual output of priorPromise to pipe to the
 * nextStep's promise
 * @param {ModulePromise} priorPromise
 * @param {Step} nextStep
 * @returns {ModulePromise}
 */
StepSequence.prototype._bind = function _bind (priorPromise, nextStep) {
  var nextPromise = new Promise(this.module)
    , seq = this;

  priorPromise.callback( function () {
    var resultPromise = nextStep.exec(seq);
    if (!resultPromise) return; // if we have a breakTo
    resultPromise.callback( function () {
      nextPromise.fulfill();
    }); // TODO breakback?
  });

  return nextPromise;
};

/**
 * This kicks off a sequence of steps.
 * Creates a new chain of promises and exposes the leading promise
 * to the incoming (req, res) pair from the route handler
 */
StepSequence.prototype.start = function start () {
  // Materialize a shallow clone, so that seq.values are different per start invocation
  var sequence = this.materialize()
    , steps = sequence.steps;

  sequence._transposeArgs(arguments);

  // Pipe through the steps
  var priorStepPromise = steps[0].exec(sequence);

  // If we have a breakTo
  if (!priorStepPromise) return;

  for (var i = 1, l = steps.length; i < l; i++) {
    priorStepPromise = sequence._bind(priorStepPromise, steps[i]);
  }
  return priorStepPromise;
};

// Used for exposing the leading promise of a step promise chain to the
// incoming args (e.g., [req, res] pair from the route handler)
StepSequence.prototype._transposeArgs = function _transposeArgs (args) {
  var accepts = this.steps[0]._accepts;
  for (var i = 0, l = accepts.length; i < l; i++) {
    var paramName = accepts[i];
    // Map the incoming arguments to the named parameters 
    // that the first step is expected to accept.
    this.values[paramName] = args[i];
  }
};

StepSequence.prototype.clone = function clone (submodule) {
  // TODO extractConfigParam is a hack
  function extractConfigParam (name) {
    var parts = name.split(':');
    if (parts.length === 1) return name;
    return parts.slice(1).join(':');
  }
  var configParam = extractConfigParam(this.name)
    , sequence = submodule._createStepSequence(this.name, this._description, configParam)
    , steps = this._steps;
  for (var stepName in steps) {
    sequence.step(steps[stepName]);
  }
  return sequence;
};

StepSequence.prototype.materialize = function materialize () {
  return Object.create(this, { values: { value: {} } });
};

// TODO Replace logic here with newer introspection code
StepSequence.prototype.validateSteps = function validateSteps () {
  var steps = this.steps;
  for (var i = 0, l = steps.length; i < l; i++) {
    var step = steps[i];
    step.validate();

    if (i === 0) {
      var paramsToDate = step._accepts;
    }

    var missingParams = step._accepts.filter( function (param) {
      return paramsToDate.indexOf(param) === -1;
    });

    if (i > 0 && missingParams.length) {
      throw new Error('At step, ' + step.name + ', you are trying to access the parameters: ' +
        missingParams.join(', ') + ' . However, only the following parameters have been ' +
        'promised from prior steps thus far: ' + paramsToDate.join(', '));
    }

    paramsToDate = paramsToDate.concat(step._promises);
  }
};

Object.defineProperty(StepSequence.prototype, 'steps', {
  get: function () {
    // Compile the steps by pulling the step names from the module
    var allSteps = this._steps
      , orderedSteps = this._orderedStepNames.map( function (stepName) {
          return allSteps[stepName];
        })
      , seq = this;

    function compileSteps () {
      var paramsToDate = []
        , missingParams;

      var steps = orderedSteps.map( function (step, i) {
        var meta = { missing: [], step: step, missingParams: [], paramsToDate: {} };
        if (! ('promises' in step)) {
          meta.missing.push('promises');
        }
        if (! ('accepts' in step)) {
          meta.missing.push('accepts');
        }

        if (('accepts' in step) && i === 0) {
          paramsToDate = paramsToDate.concat(step._accepts);
        }

        missingParams = !step._accepts ? [] : step._accepts.filter( function (param) {
          return paramsToDate.indexOf(param) === -1;
        });

        if (step._promises) {
          paramsToDate = paramsToDate.concat(step._promises);
        }

        if (missingParams.length) {
          meta.missingParams = missingParams;
          meta.paramsToDate = paramsToDate;
        }

        if (! (('_' + step.name) in seq.module)) {
          meta.missing.push('its function');
        }

        return meta;
      });

      return steps;
    }

    var compiledSteps;

    Object.defineProperty(orderedSteps, 'incomplete', { get: function () {
      compiledSteps || (compiledSteps = compileSteps());
      return compiledSteps.filter( function (stepMeta) {
        return stepMeta.missing.length > 0;
      }).map( function (stepMeta) {
        var error = 'is missing: ' + stepMeta.missing.join(', ');
        return { name: stepMeta.step.name, error: error };
      });
    } });

    Object.defineProperty(orderedSteps, 'invalid', { get: function () {
      compiledSteps || (compiledSteps = compileSteps());
      return compiledSteps.filter( function (stepMeta) {
        return stepMeta.missingParams.length > 0;
      }).map( function (stepMeta) {
        var error = 'is trying to accept the parameters: ' + 
                  stepMeta.missingParams.join(', ') + 
                  ' . However, only the following parameters have ' + 
                  'been promised from prior steps thus far: ' + 
                  stepMeta.paramsToDate.join(', ');
        return { name: stepMeta.step.name, error: error };
      });
    } });

    return orderedSteps;
  }
});

module.exports = StepSequence;
