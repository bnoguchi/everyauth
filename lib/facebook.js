var OAuthModule = require('./oauth');

var fb = module.exports = new OAuthModule('https://graph.facebook.com');

fb.routes.get['/auth/facebook'] = function (req, res) {
  var authorizeUri = fb.oauth.getAuthorizeUrl({redirect_uri: fb._callbackUri, scope: 'email'}); // TODO Make scope configurable
  res.redirect(authorizeUri);
};

// There's another route /auth/facebook/callback that is defined
// in ./oauth.js when you declare your callbackUri

var fb = module.exports = 
oauthModule.submodule()
  .callbackUri('https://graph.facebook.com')
  .get('/auth/facebook', function (req, res) {
    var authorizeUri = fb.oauth.getAuthorizeUrl({redirect_uri: fb._callbackUri, scope: 'email'}); // TODO Make scope configurable
    res.redirect(authorizeUri);
  });
