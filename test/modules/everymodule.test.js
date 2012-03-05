var everymodule = require('../../lib/modules/everymodule')
  , expect = require('expect.js')
  , facebook = require('../../lib/modules/facebook')
  , Sequence = require('../../lib/stepSequence')

describe('everymodule', function () {
  describe('configurables', function () {
    describe('#configurable()', function () {
      it('should show all configurable params and their descriptions as an object', function () {
        var config = everymodule.configurable();
        expect(config).to.be.an('object');
        expect(config.moduleTimeout).to.equal('How long to wait per step before timing out and invoking any timeout callbacks');
      });

      it('should shift with a default set of configurable params', function () {
        var config = everymodule.configurable();
        expect(config).to.only.have.keys('moduleTimeout', 'moduleErrback', 'logoutRedirectPath',
                                         'findUserById', 'logoutPath', 'handleLogout');
      });
    });

    describe('declaration with a simple parameter name and description', function () {
      before( function () {
        everymodule.configurable('simpleParam', 'simple description');
      });

      it('#configurable(param) should return the description', function () {
        expect(everymodule.configurable('simpleParam')).to.equal('simple description');
      });

      it('should generate a function named after the param that acts as a setter and getter', function () {
        expect(everymodule.simpleParam('hello world')).to.equal(everymodule);
        expect(everymodule.simpleParam()).to.equal('hello world');
      });

    });

    describe('declaration with just a parameter name', function () {
      it('should have a "No Description" as the description', function () {
        expect(everymodule.configurable('paramWithoutDesc')).to.equal(everymodule);
        expect(everymodule.configurable('paramWithoutDesc')).to.equal('No Description');
      });
    });

    describe('declaration with a description and setter', function () {
      before( function () {
        everymodule.configurable('paramWithSetter', {
            description: 'param with setter'
          , setter: function (targetVal) {
              this.simpleParam(targetVal);
            }
        });
      });
    });
  });

  describe('introspection', function () {
    describe('opening up pre-defined routes', function () {
      it('should be a StepSequence', function () {
        expect(everymodule.get('logoutPath')).to.be.a(Sequence);
      });

      it('should not over-ride the sequence as defined before the introspectionc all', function () {
        var preSeq = everymodule.get('logoutPath')
          , postSeq = everymodule.get('logoutPath');
        expect(preSeq).to.equal(postSeq);
      });
    });
  });

  describe('routes', function () {
  });

  describe('creating steps for a sequence', function () {
    describe('the new step', function () {
      it('should be equipped with a method named after the ...');
    });
  });

  describe('submodules', function () {
    beforeEach( function () {
      everymodule.configurable('inheritableParam', 'simple description');
    });

    it('should inherit new configurable params', function () {
      expect(facebook.configurable('inheritableParam')).to.equal('simple description');

      expect(facebook.simpleParam).to.be.a('function');

      everymodule.simpleParam('hello world');
      expect(facebook.simpleParam()).to.equal('hello world');
    });

    it("submodules parameter value setting should not set any ancestors' parameter values", function () {
      expect(everymodule.simpleParam()).to.equal('hello world');
      expect(facebook.simpleParam()).to.equal('hello world');
      facebook.simpleParam('foo bar');
      expect(facebook.simpleParam()).to.equal('foo bar');
      expect(everymodule.simpleParam()).to.equal('hello world');
    });
  });
});
