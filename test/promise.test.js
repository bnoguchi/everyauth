var should = require('should')
  , Promise = require('../lib/promise');

module.exports = {
  'fulfill called >1 times should only have an effect once': function (done) {
    var p = new Promise()
      , test = null;
    p.callback( function (val) {
      test = val;
    });
    p.fulfill(1);
    p.fulfill(2);
    setTimeout( function () {
      test.should.equal(1);
      done();
    }, 1000);
  }
};
