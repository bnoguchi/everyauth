var expect = require('expect.js')
  , utils = require('../lib/utils')
  , clone = utils.clone
  , extractHostname = utils.extractHostname
  , delegate = utils.delegate;

describe('utilities', function () {
  describe('clone', function () {
    describe('an array', function () {
      it('should not === the original array', function () {
        var arr = [{a: '1'}]
          , arrClone = clone(arr);
        expect(arrClone).to.not.equal(arr);
      });

      it('should deep copy members', function () {
        var arr = [{ a: '1'}]
          , arrClone = clone(arr);

        expect(arrClone[0]).to.not.equal(arr[0]);
        expect(arrClone[0]).to.eql(arr[0]);
      });
    });

    describe('an object', function () {
      it('should deep copy the object', function () {
        var obj = {
              a: {
                b: {
                  c: [1, 2, 3]
                }
              }
            }
          , objClone = clone(obj);

        return expectEquiv(obj, objClone);

        function expectEquiv (a, b) {
          if (Array.isArray(a)) {
            expect(a).to.have.length(b.length);
            for (var i = a.length; i--; ) {
              expectEquiv(a[i], b[i]);
            }
            return;
          }
          if (a.constructor == Object) {
            expect(a).to.only.have.keys(Object.keys(b));
            for (var k in a) {
              expectEquiv(a[k], b[k]);
            }
            return;
          }
          expect(a).to.equal(b);
        }
      });
    });
  });

  describe('extractHostname', function () {
    // TODO
  });

  describe('delegate', function () {
    var delegators = {
        'unchained': function (from, name, to, handler) {
          return delegate(from, name, to, handler);
        }

      , 'chained': function (from, name, to, handler) {
          return delegate(from, name).to(to, handler);
        }
    }

    for (var delegationStyle in delegators) {
      describe(delegationStyle, (function (setupDelegation) {
        return function () {
          delegateTestInterface(setupDelegation);
        };
      })(delegators[delegationStyle]));
    }

    function delegateTestInterface (setupDelegation) {
      describe('should delegate property lookup', function () {
        it('should delegate property lookup', function () {
          var from = { a: '1' }
            , to   = { b: '2' }
          expect(from.b).to.not.be.ok();
          setupDelegation(from, 'b', to);
          expect(from.b).to.equal('2');
        });
      });

      it('should delegate method lookup', function () {
        var from = { a: '1' }
          , to   = {
              fn: function fn () {
                return 'hello';
              }
            };

        expect(from.fn).to.not.be.ok();
        setupDelegation(from, 'fn', to)
        expect(from.fn()).to.equal('hello');
      });
    }
  });
});
