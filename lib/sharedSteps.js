var Step = require('./step');

exports.getSession = new Step('getSession')
  .description('Retrieves the session for the incoming request')
  .accepts('req')
  .promises('session')
  .fn( function (req) {
    return req.session;
  });

// TODO Add addToSession here
