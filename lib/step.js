var Promise = require('./promise')
  , clone = require('./utils').clone;

var Step = module.exports = function Step (name, _module) {
  this.name = name;

  // defineProperty; otherwise,
  // clone will overflow when we clone a module
  Object.defineProperty(this, 'module', { value: _module });
};

Step.prototype = {
    /**
     * @returns {Promise}
     */
    exec: function (seq) {
      var accepts = this.accepts
        , promises = this.promises
        , block = this.block
        , _module = this.module
        , stepName = this.name
        , self = this
        , errorCallback = function (error) {
            // Ensure that seq.values are always passed back to moduleErrback
            if (self.errback) {
              self.errback(error, seq.values);
            } else if (_module._moduleErrback) {
              _module._moduleErrback(error, seq.values);
            } else {
              throw new Error('Missing module or step errback');
            }
          };


      if (this.debug) {
        console.log('starting step - ' + this.name);
      }

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
          var step = this.__proto__._steps[stepName];
          if (!step) return;
          var superArgs = arguments.length ? arguments : args;
          step.block.apply(this, superArgs);
        };
        ret = block.apply(_module, args);
        delete _module._super;
      } catch (breakTo) {
        // Catch any sync breakTo's if any
        if (breakTo.isSeq) {
          if (this.module.everyauth.debug)
            console.log("breaking out to " + breakTo.name);
          breakTo.start.apply(breakTo, breakTo.initialArgs);
          // TODO Garbage collect the promise chain
          return;
        } else {
          // Else, we have a regular exception
          errorCallback(breakTo);
        }
      }

      if (promises && promises.length &&
            'undefined' === typeof ret) {
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
      ret = (ret instanceof Promise)
          ? ret
          : Array.isArray(ret)
            ? promises.length === 1
              ? this.module.Promise([ret])
              : this.module.Promise(ret)
            : this.module.Promise([ret]);

      if (seq.debug) {
        ret.callback( function () {
          console.log('...finished step');
        });
      }

      var convertErr = _module._convertErr;
      if (convertErr) {
        var oldErrback = ret.errback;
        ret.errback = function (fn, scope) {
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

      ret.errback(errorCallback);

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
        ret.fail(new Error('Step ' + stepName + ' of `' + _module.name + '` module timed out.'));
      });

      var timeoutMs = this.timeout || _module.moduleTimeout();
      ret.timeout(timeoutMs);

      return ret;
    }

    /**
     * Unwraps values (from the sequence) based on
     * the step's this.accepts spec.
     */
  , _unwrapArgs: function (seq) {
      return this.accepts.reduce( function (args, accept) {
        args.push(seq.values[accept]);
        return args;
      }, []);
    }
  , clone: function (name, _module) {
      var step = new Step(name, _module);
      step.accepts = clone(this.accepts);
      step.promises = clone(this.promises);
      step.description = this.description;
      step.timeout = this.timeout;
      step.errback = this.errback;
      return step;
    }
};

Object.defineProperty(Step.prototype, 'block', {
  get: function () {
    return this._block || (this._block = this.module[this.name]());
  }
});

Object.defineProperty(Step.prototype, 'debug', {
  get: function () {
    return this.module.everyauth.debug;
  }
});
