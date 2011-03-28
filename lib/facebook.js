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
  })
  .addToSession( function (sess, user, cred, fbData) {
    if (!sess.auth) sess.auth = {};
    if (!sess.auth.userId) sess.auth.userId = user.id;
    if (!sess.auth.fb) sess.auth.fb = {};
    if (!sess.auth.fb.user) sess.auth.fb.user = fbData;
    sess.auth.fb.access_token = cred.accessToken;
    if (cred.refreshToken) sess.auth.fb.refresh_token = cred.refreshToken;
  });

fb.name = 'facebook';
