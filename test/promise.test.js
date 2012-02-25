var expect = require('expect')
  , Promise = require('../lib/promise');

describe('Promise', function () {
  '#fulfilll being invoked >1 times should only have an effect once': function (done) {
    var p = new Promise()
      , test = null;
    p.callback( function (val) {
      test = val;
    });
    p.fulfill(1);
    p.fulfill(2);
    setTimeout( function () {
      expect(test).to.equal(1);
      done();
    }, 1000);
  }
});
