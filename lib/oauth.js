var everyModule = require('./everymodule')
  , OAuth = require('oauth').OAuth2
  , url = require('url');

// facebook, twitter, and other OAuth2-dependent modules
// inherit from this

// TODO How about?
//      everyauth.fb
//        callbackUri('/abc')
//        callbackUri('/abc', function () {...})
//        // Automatically comes with uri and/or handler replacing
//        // capabilities
//
var oauthModule = module.exports = everyModule.submodule({
    setters: 'apiHost appId appSecret callbackUri fetchOAuthUser myHostname'
  , on: {
        'set.callbackUri': function (strategy, uri) {
          // Setup callback route
          strategy.GET(uri, function (req, res) {
            var parsedUrl = url.parse(req.url, true);
            if (parsedUrl.query && parsedUrl.query.code) {
              strategy.oauth.getOAuthAccessToken(
                  parsedUrl.query.code
                , {redirect_uri: strategy._myHostname + uri} 
                , function (err, accessToken, refreshToken) {
                    if (err)
                      return strategy.fail(req, res, err);
                    var uid
                      , cred = {
                            accessToken: accessToken
                          , refreshToken: refreshToken
                        };
                    // Fire the succeed hook
                    strategy.succeed(req, res, uid, cred);
                  });
            }
          });
        }
      , 'routeApp': function (strategy) {
          strategy.oauth = new OAuth(strategy._appId, strategy._appSecret, strategy._apiHost);
        }
      , 'start': function (strategy) {
          if (strategy._fetchOAuthUser)
            strategy.hook('fetchOAuthUserStep', function (next, nextnext, next3, req, res, uid, cred, info) {
              this.oauth.getProtectedResource(this._apiHost + '/me', cred.accessToken, function (err, data, response) {
                if (err) throw err; // TODO Better error handling
                info = JSON.parse(data);
                return next(nextnext, next3, req, res, uid, cred, info);
              });
            });
            strategy.pre('findOrCreateUserStep', function (next, nextnext, next3, req, res, uid, cred, info) {
              strategy.fetchOAuthUserStep(next, nextnext, next3, req, res, uid, cred, info);
            });
        }
    }
  })
  .fetchOAuthUser(true)
