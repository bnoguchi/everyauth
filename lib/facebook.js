var oauthModule = require('./oauth');

// There's another route /auth/facebook/callback that is defined
// in ./oauth.js in the event handler for the event 'set.callbackUri'

var fb = module.exports = 
oauthModule.submodule()
  .apiHost('https://graph.facebook.com')
  .callbackUri('/auth/facebook/callback')
  .get('/auth/facebook', function (req, res) {
    var authorizeUri = fb.oauth.getAuthorizeUrl({redirect_uri: fb._myHostname + fb._callbackUri, scope: 'email'}); // TODO Make scope configurable
    res.writeHead(303, { 'Location': authorizeUri });
    res.end();
  });
