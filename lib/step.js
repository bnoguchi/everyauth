var Promise = require('./promise');
var clone = require('./utils').clone;
var EventEmitter = require('events').EventEmitter;
var util = require('util');

module.exports = Step;

// Steps help define a sequence of logic that pipes data through a chain of
// properties. A new chain of promises is generated every time the set of steps
// is started.
function Step (name, block) {
  EventEmitter.call(this);
  this.name = name;
  this.block = block;
}

Step.UndefinedStepPromiseError = UndefinedStepPromiseError;
function UndefinedStepPromiseError (step) {
  Error.call(this);
  Error.captureStackTrace(this, arguments.callee);
  this.name = 'UndefinedStepPromiseError';
  this.message = 'Step ' + step.name +
    ' is promising: ' + step._promises.join(', ') +
    ' ; however, the step returns undefined. ' +
    'Fix the step by returning the expected values OR ' +
    'by returning a Promise that promises the expected values.';
}
util.inherits(UndefinedStepPromiseError, Error);

Step.TimeoutError = TimeoutError;
function TimeoutError (step) {
  Error.call(this);
  Error.captureStackTrace(this, arguments.callee);
  this.name = 'TimeoutError';
  this.message = 'Step ' + step.name + ' timed out.'
}
util.inherits(TimeoutError, Error);

util.inherits(Step, EventEmitter);

Step.prototype.accepts = function (input) {
  this._accepts = input && input.split(/\s+/) || null;
  return this;
};

Step.prototype.promises = function (output) {
  this._promises = output && output.split(/\s+/) || null;
  return this;
};

Step.prototype.description = function (desc) {
  this.description = desc;
  if (desc) desc = 'STEP FN [' + this.name + '] - ' + desc;
  this.emit('description', desc);
  return this;
};

Step.prototype.HALT = {};

/**
 * @returns {Promise}
 */
Step.prototype.exec = function (values, onError, debug) {
  if (debug) {
    console.log('starting step - ' + this.name);
  }

  /* Apply the step logic */
  var args = this._unwrapArgs(values);
  var out = this.block.apply(null, args);
  if (out === this.HALT) {
    return out;
  }
  var promises = this._promises;
  if (promises && promises.length && 'undefined' === typeof out) {
    onError(new UndefinedStepPromiseError(this));
  }
  // Convert return value into a Promise
  // if it's not yet a Promise
  out = (out instanceof Promise)
      ? out
      : Array.isArray(out)
        ? promises.length === 1
          ? new Promise([out])
          : new Promise(out)
        : new Promise([out]);

  if (debug) {
    out.callback( function () {
      console.log('...finished step');
    });
  }

  out.errback(onError);

  // Keep track of the values promised by this step.
  out.callback( function () {
    var returned = arguments;
    if (promises !== null) promises.forEach( function (valName, i) {
      values[valName] = returned[i];
    });
  });

  var step = this;
  out.timeback( function () {
    out.fail(new TimeoutError(step));
  });

  var timeoutMs = this.timeout;
  out.timeout(timeoutMs);

  return out;
};

/**
 * Unwraps values (from the sequence) based on
 * the step's this.accepts spec.
 */
Step.prototype._unwrapArgs = function (values) {
  return this._accepts.reduce( function (args, accept) {
    args.push(values[accept]);
    return args;
  }, [])
  // There is a hidden last argument to every step function that
  // is all the data promised by prior steps up to the step's point
  // in time. We cannot anticipate everything a developer may want via
  // `accepts(...)`. Therefore, just in case, we give the developer
  // access to all data promised by prior steps via the last argument -- `values`
  .concat(values);
};

Step.prototype.clone = function (name, block) {
  var step = new Step(name, block);
  step._accepts = clone(this._accepts);
  step._promises = clone(this._promises);
  step.description = this.description;
  step.timeout = this.timeout;
  step.errback = this.errback;
  return step;
};

// For incoming arguments, assigns their value to a key in values,
// where the key corresponds to the name of the parameter in the step.accepts
// list of accepted inputs.
Step.prototype.projectArgs = function (args, values) {
  return this._accepts.reduce( function (accum, name, i) {
    accum[name] = args[i];
    return accum;
  }, values || {});
};

Step.prototype.validate = function () {
  if ('undefined' === typeof this._accepts) {
    return new Error('Need to declare accepts for the step: ' + this.name);
  }
  if ('undefined' === typeof this._promises) {
    return new Error('Need to declare promises for the step: ' + this.name);
  }
};
