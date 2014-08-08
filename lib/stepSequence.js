var Step = require('./step');
var clone = require('./utils').clone;

var proto = module.exports = function (alias, module, debug) {
  // Kicks off a sequence of steps based on a route
  // TODO Breakback?
  // This executes the sequence. It kicks off a sequence of steps, creating a
  // lazily growing chain of promises and exposing the leading promise to the
  // incoming arguments, which for us will be the (req, res, next) arguments of
  // the route handler.
  function middleware (req, res, next) {

    // TODO We need to do this? How to handle errors?
    // Overwrite module errback with connect's next
    module.moduleErrback(next);

    // Expose the leading promise of a step promise chain to the incoming args
    // (e.g., [req, res, next] from the route handler)
    var firstStep = steps[0];
    var values = firstStep.projectArgs(arguments);

    var i = 0;
    return (function pipe () {
      var step = steps[i++];
      if (! step) return;
      // step.exec takes values as input and updates values with its outputs.
      var resultPromise = step.exec(values, next, debug);
      if (resultPromise === Step.prototype.HALT) return; // If we have a halt
      resultPromise.errback(next);
      resultPromise.callback(pipe);
      return resultPromise;
    })();
  };

  middleware.__proto__ = proto;

  middleware.alias = alias;
  middleware.module = module;
  middleware.debug = debug;
  var steps = middleware.steps = [];

  return middleware;
};

proto.step = function (name) {
  var steps = this.steps;
  for (var i = 0, l = steps.length; i < l; i++) {
    if (name === steps[i].name) return this._currStep = steps[i];
  }

  var step = this._currStep =
    new Step(name, createBlock(this.module, name));
  step.timeout = this.module._moduleTimeout || -1;
  steps.push(step);
  var module = this.module;
  step.on('description', function (desc) {
    module.configurable(step.name, desc);
  });
  return step;
};

proto.accepts = function (input) {
  this._currStep.accepts(input);
  return this;
};

proto.promises = function (output) {
  this._currStep.promises(output);
  return this;
};

proto.description = function (desc) {
  this._currStep.description(desc);
  return this;
};

proto.validate = function () {
  var steps = this.steps
  for (var i = 0, l = steps.length; i < l; i++) {
    var err = steps[i].validate();
    if (err) return err;
  }

  var paramsToDate = steps[0]._accepts.concat(steps[0]._promises);
  var missingParams;
  for (var i = 1, l = steps.length; i < l; i++) {
    var step = steps[i];

    var missingParams = step._accepts.filter( function (param) {
      return paramsToDate.indexOf(param) === -1;
    });

    if (missingParams.length) {
      return new Error('At step, ' + step.name + ', you are trying to access the parameters: ' +
        missingParams.join(', ') + ' . However, only the following parameters have been ' +
        'promised from prior steps thus far: ' + paramsToDate.join(', '));
    }

    paramsToDate = paramsToDate.concat(step._promises);

    if ('undefined' === typeof this.module[step.name]()) {
      return new Error('No one defined the function for the following step: ' + step.name + ' in the module ' + this.module.name);
    }
  }
};

proto.clone = function (submodule) {
  var sequence = proto(this.alias, submodule, this.debug);
  var steps = this.steps;
  for (var i = 0, l = steps.length; i < l; i++) {
    var step = steps[i];
    sequence.steps[i] = step.clone(step.name, createBlock(submodule, step.name));
  }
  return sequence;
};

function createBlock (module, name) {
  return function () {
    var block = module[name]();
    // Add _super access
    module._super = function () {
      var superBlockGetter = module.__proto__[name]
      if (!superBlockGetter) return;
      var superBlock = superBlockGetter.call(module.__proto__);
      var superArgs = arguments.length ? arguments : args;
      superBlock.apply(module, superArgs);
    };
    var args = arguments;
    var out = block.apply(module, args);
    delete module._super;
    return out;
  };
}
