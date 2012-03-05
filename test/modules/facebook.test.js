var expect = require('expect.js')
  , fb = require('../../lib/modules/facebook');

describe('facebook', function () {
  it('should be valid', function () {
    expect(fb.validateSequences.bind(fb)).to.not.throwError();
  });
});
