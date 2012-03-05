var expect = require('expect.js')
  , everymodule = require('../lib/modules/everymodule')
  , StepSequence = require('../lib/stepSequence')
  , Step = require('../lib/step')

describe('StepSequence', function () {
  it('should be an instanceof StepSequence', function () {
    expect(new StepSequence('_')).to.be.a(StepSequence);
  });

  it('should have a name', function () {
    var sequence = new StepSequence('new-sequence');
    expect(sequence.name).to.equal('new-sequence');
  });

  describe('#step', function () {
    var sequence;
    beforeEach( function () {
      sequence = new StepSequence('seq');
    });

    it('should emit an addStep event, passing the handler the step', function (done) {
      sequence.on('addStep', function (step) {
        expect(step).to.be.a(Step);
        done();
      });
      sequence.step('step-for-testing-emitting');
    });

    describe('passed in a string name', function () {
      it('should return a Step', function () {
        expect(sequence.step('step-name')).to.be.a(Step);
      });

      it('should return a step that is added to #steps', function () {
        var step = sequence.step('step-name');
        expect(sequence.steps).to.contain(step);
      });
    });

    describe('passed in a Step', function () {
      it('should return a step prototypically inheriting from the incoming step', function () {
        var inStep = new Step('shared-step-one')
          , outStep = sequence.step(inStep);
        expect(outStep).to.be.a(Step);
        expect(outStep.__proto__).to.equal(inStep);
      });

      it('should return a step that is added to #steps', function () {
        var inStep = new Step('shared-step-two');
        var step = sequence.step(inStep);
        expect(sequence.steps).to.contain(step);
      });
    });

    describe('as an introspection method', function () {
      it('should return the existing step', function () {
        var firstReturnedStep = sequence.step('step-to-introspect')
          , secondReturnedStep = sequence.step('step-to-introspect');
        expect(firstReturnedStep).to.equal(secondReturnedStep);
      });
    });

    describe('the resulting step', function () {
      var step;
      beforeEach( function () {
        step = sequence.step('step-for-testing-delegation')
      });

      it('should have a #step method', function () {
        expect(step.step).to.be.a('function');
      });

      it('should have a `step` method that acts as if called on the parent sequence', function () {
        var stepFromStep = step.step('step-created-by-another-step')
          , stepFromSeq = sequence.step('step-created-by-another-step');
        expect(stepFromStep).to.equal(stepFromSeq);
      });
    });
  });

  describe('#validateSteps', function () {
    it("should throw an error if a step declares at least one accepts param that has not been declared via prior steps' promises", function () {
      var sequence = new StepSequence('seq-with-invalid-step-params');
      sequence
        .step('first')
          .accepts('a')
          .promises('c')
          .fn(noop)
        .step('second')
          .accepts('b')
          .promises('e')
          .fn(noop);
      expect(sequence.validateSteps.bind(sequence)).to.throwError();
    });

    it('should throw an error if any step is invalid', function () {
      var sequence = new StepSequence('seq-with-invalid-steps');
      sequence
        .step('first')
          .accepts('a')
          .promises('b')
          // missing fn(...)
      expect(sequence.validateSteps.bind(sequence)).to.throwError();
    });
  });

  describe('#clone', function () {
    var origSeq, clonedSeq;
    beforeEach( function () {
      origSeq = new StepSequence('seq-to-clone');
      origSeq
        .step('first')
          .accepts('a')
          .promises('b')
          .fn(noop);
      clonedSeq = origSeq.clone(everymodule);
    });

    it('should have the same name as the original', function () {
      expect(clonedSeq.name).to.equal(origSeq.name);
    });

    it('should have the same number of steps as the original', function () {
      expect(clonedSeq.steps).to.have.length(origSeq.steps.length);
    });

    describe('cloned sequence steps', function () {
      it('should have the same declared promises and accepts of the original', function () {
        var clonedAccepts = clonedSeq.step('first').accepts()
          , origAccepts = origSeq.step('first').accepts();
        expect(clonedAccepts).to.equal(origAccepts);
      });

      it('should be able to declare new promises and accepts without over-writing the original', function () {
        clonedSeq.step('first').accepts('x').promises('y');
        var clonedAccepts = clonedSeq.step('first').accepts()
          , clonedPromises = clonedSeq.step('first').promises()
          , origAccepts = origSeq.step('first').accepts()
          , origPromises = origSeq.step('first').promises();

        expect(clonedAccepts).to.not.equal(origAccepts);
      });

      it('should have the same fn as the original', function () {
        var clonedFn = clonedSeq.step('first').fn()
          , origFn = origSeq.step('first').fn();
        expect(clonedFn).to.equal(origFn);
      });

      it('should have _sequence strictly equal to the cloned StepSequence', function () {
        expect(clonedSeq.steps).to.not.be.empty();
        expect(clonedSeq.step('first').sequence).to.equal(clonedSeq);
      });
    });

  });
});

function noop () {}
