var expect = require('expect.js')
  , Step = require('../lib/step')

describe('Step', function () {
  describe('#accepts', function () {
    it('should return the calling Step', function () {
      var step = new Step('step-name');
      expect(step.accepts('req res')).to.be.a(Step);
    });

    it('should return the cached value if called with 0 args', function () {
      var step = new Step('step-name');
      step.accepts('req res');
      expect(step.accepts()).to.eql(['req', 'res']);
    });
  });

  describe('#promises', function () {
    it('should return the calling Step', function () {
      var step = new Step('step-name');
      expect(step.promises('session')).to.be.a(Step);
    });

    it('should return the cached value if called with 0 args', function () {
      var step = new Step('step-name');
      step.promises('session');
      expect(step.promises()).to.eql(['session']);
    });
  });

  describe('#description', function () {
    it('should return the calling Step', function () {
      var step = new Step('step-name');
      expect(step.description('blah blah')).to.be.a(Step);
    });

    it('should return the cached value if called with 0 args', function () {
      var step = new Step('step-name');
      step.description('yo');
      expect(step.description()).to.equal('yo');
    });

    it('should emit the "describeStep" event, passing the handler the step', function (done) {
      var step = new Step('step-name');
      step.on('description', function (emittedStep) {
        expect(step).to.equal(emittedStep);
        expect(emittedStep.description()).to.equal('etc etc');
        done();
      });
      step.description('etc etc');
    });
  });

  describe('#fn', function () {
    it('should return the calling Step', function () {
      var step = new Step('step-name');
      expect(step.description('blah blah')).to.be.a(Step);
    });

    it('should return the cached value if called with 0 args', function () {
      var step = new Step('step-name');
      step.fn(noop);
      expect(step.fn()).to.equal(noop);
    });
  });

  describe('#validate', function () {

    it('should throw an error with undeclared accepts', function () {
      var step = new Step('invalid').promises('x y').fn(noop);
      expect(step.validate.bind(step)).to.throwError();
    });

    it('should throw an error with undeclared promises', function () {
      var step = new Step('invalid').accepts('a b').fn(noop);
      expect(step.validate.bind(step)).to.throwError();
    });

    it('should throw an error with undeclared fn', function () {
      var step = new Step('invalid').accepts('a b').promises('x y');
      expect(step.validate.bind(step)).to.throwError();
    });

    it('should not throw an error if with declared accepts and promises', function () {
      var step = new Step('valid').accepts('a b').promises('x y').fn(noop);
      expect(step.validate.bind(step)).to.not.throwError();
    });
  });
});

function noop () {}
