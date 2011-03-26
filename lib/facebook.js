var oauthModule = require('./oauth');

// There's another route /auth/facebook/callback that is defined
// in ./oauth.js in the event handler for the event 'set.callbackUri'

var fb = module.exports = 
oauthModule.submodule()
  .setters('scope')
  .apiHost('https://graph.facebook.com')
  .callbackUri('/auth/facebook/callback')
  .GET('/auth/facebook', function (req, res) {
    var scope = fb._scope;
    if ('function' === typeof scope) {
      scope = scope(req);
    }
    var authorizeUri = fb.oauth.getAuthorizeUrl({redirect_uri: fb._myHostname + fb._callbackUri, scope: scope});
    res.writeHead(303, { 'Location': authorizeUri });
    res.end();
  });

fb.name = 'facebook';
