var Promise = require('./promise')
  , EventEmitter = require('events').EventEmitter
  , debug = require('./debug')

function Step (name, parentSequence) {
  EventEmitter.call(this);
  this.name = name;
  this.sequence = parentSequence;
};

Step.prototype.constructor = Step;

Step.prototype.__proto__ = EventEmitter.prototype;

/**
 * Declarative methods
 */
Step.prototype.accepts = function accepts (input) {
  if (arguments.length === 0) return this._accepts;

  this._accepts = input && input.split(/\s+/) || null;
  return this;
};

Step.prototype.promises = function promises (output) {
  if (arguments.length === 0) return this._promises;

  this._promises = output && output.split(/\s+/) || null;
  return this;
};

Step.prototype.description = function description (desc) {
  if (arguments.length === 0) return this._description;

  this._description = desc;
  this.emit('description', this);
  return this;
};

Step.prototype.fn = function fn (func) {
  if (arguments.length === 0) return this._function;

  this._function = func;
  return this;
};

Step.prototype.stepTimeout = function stepTimeout (millis) {
  this._timeout = millis;
  return this;
};

Step.prototype.stepErrback = function stepErrback (fn) {
  this._errback = fn;
  return this;
};

Step.prototype.canBreakTo = function canBreakTo (sequenceName) {
  // TODO Implement this (like static typing)
  //      unless `canBreakTo` only needed for
  //      readability
  return this;
};

/**
 * Step validation methods
 */

Step.prototype.validate = function validateStep () {
  if (! ('_accepts' in this)) {
    throw new Error('You did not declare accepts for the step: ' + this.name + ' in the module ' + this.sequence.module.name);
  }
  if (! ('_promises' in this)) {
    throw new Error('You did not declare promises for the step: ' + this.name + ' in the module ' + this.sequence.module.name);
  }
  if (! ('_function' in this)) {
    // TODO Remove this Error, since invoking the arg to typeof (see line above)
    //      already throws an Error
    throw new Error('You did not declare the function for the following step: ' + this.name + ' in the module ' + this.sequence.module.name);
  }
};

/**
 * Step execution methods
 */

/**
 * Executes the step and wraps up the step result in a Promise.
 * @returns {ModulePromise}
 */
Step.prototype.exec = function exec (seq) {
  var accepts = this._accepts
    , promises = this._promises
    , fn = this._function
    , _module = this.sequence.module
    , errorCallback = this._errback || _module._moduleErrback // Configured errback
    , self = this;

  debug('starting step - ' + this.name);

  var args = this._unwrapArgs(seq);

  // There is a hidden last argument to every step function that
  // is all the data promised by prior steps up to the step's point
  // in time. We cannot anticipate everything a developer may want via
  // `accepts(...)`. Therefore, just in case, we give the developer
  // access to all data promised by prior steps via the last argument -- `seq.values`
  args.push(seq.values);

  var ret;
  try {
    // Apply the step logic

    // Add _super access
    _module._super = function () {
      var step = this.__proto__._steps[self.name];
      if (!step) return;
      var superArgs = arguments.length ? arguments : args;
      step._function.apply(this, superArgs);
    };
    ret = fn.apply(_module, args);
    delete _module._super;
  } catch (breakTo) {
    // Catch any sync breakTo's if any
    if (breakTo instanceof StepSequence) {
      debug('breaking out to ' + breakTo.name);
      breakTo.start.apply(breakTo, breakTo.initialArgs);
      // TODO Garbage collect the promise chain
      return;
    }
    // Else, we have a regular exception
    // TODO Scope this fn (use step of module as context?)
    errorCallback(breakTo, seq.values);
  }

  if (promises && promises.length && 'undefined' === typeof ret) {
    // TODO Scope this fn
    errorCallback(
      new Error('Step ' + this.name + ' of `' + _module.name + 
        '` is promising: ' +  promises.join(', ') + 
        ' ; however, the step returns nothing. ' +
        'Fix the step by returning the expected values OR ' + 
        'by returning a Promise that promises said values.')
    );
  }
  // Convert return value into a Promise
  // if it's not yet a Promise
  var promise = (ret instanceof Promise)
      ? ret
      : Array.isArray(ret)
        ? promises.length === 1
          ? new Promise(_module, [ret])
          : new Promise(_module, ret)
        : new Promise(_module, [ret]);

  promise.callback( function () {
    debug('...finished step');
  });

  var convertErr = _module._convertErr;
  if (convertErr) {
    var oldErrback = promise.errback;
    promise.errback = function (fn, scope) {
      var oldFn = fn;
      fn = function (err) {
        if (err.constructor === Object) {
          err = convertErr(err);
        } else if ('string' === typeof err) {
          err = new Error(err);
        }
        return oldFn.call(this, err);
      };
      return oldErrback.call(this, fn, scope);
    };
  }

  // TODO Scope this fn -- i.e., errorCallback?
  promise.errback(errorCallback);

  promise.callback( function () {
    // Store the returned values
    // in the sequence's state via seq.values
    var returned = arguments
      , vals = seq.values;
    if (promises !== null) promises.forEach( function (valName, i) {
      vals[valName] = returned[i];
    });
  });

  promise.timeback( function () {
    promise.fail(new Error('Step ' + self.name + ' of `' + _module.name + '` module timed out.'));
  });

  var timeoutMillis = this._timeout || _module.moduleTimeout();
  promise.timeout(timeoutMillis);

  return promise;
};

/**
 * Unwraps values (from the sequence) based on
 * the step's this.accepts spec.
 */
Step.prototype._unwrapArgs = function _unwrapArgs (seq) {
  var accepts = this._accepts
    , args = [];
  for (var i = accepts.length; i--; ) {
    var paramName = accepts[i];
    args[i] = seq.values[paramName];
  }
  return args;
};

/**
 * Methods for accessing the parent sequence or grandparent module methods.
 */

Step.prototype.step = function step (name) {
  return this.sequence.step(name);
};

module.exports = Step;

var StepSequence = require('./stepSequence');
