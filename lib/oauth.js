var everyModule = require('./everymodule')
  , OAuth = require('oauth').OAuth2
  , url = require('url');

// facebook, twitter, and other OAuth2-dependent modules
// inherit from this

var oauthModule = module.exports = everyModule.submodule({
    setters: 'apiHost appId appSecret authTimeout callbackUri fetchOAuthUser myHostname'
  , on: {
        'set.callbackUri': function (strategy, uri) {
          // Setup callback route
          strategy.get(uri, function (req, res) {
            var parsedUrl = url.parse(req.url, true);
            if (parsedUrl.query && parsedUrl.query.code) {
              strategy.oauth.getOAuthAccessToken(
                  parsedUrl.query.code
                , {redirect_uri: strategy._myHostname + uri} 
                , function (err, accessToken, refreshToken) {
                    if (err) return strategy.fail(req, res, err);
                    var uid
                      , cred = {
                            accessToken: accessToken
                          , refreshToken: refreshToken
                        };
                    strategy.succeed(req, res, uid, cred);
                  });
            }
          });
        }
      , 'set.fetchOAuthUser': function (strategy, flag) {
          if (flag) { // Turn on fetchOAuthUser
            // Cache this callback, so we can remove it later
            strategy._cachedPreFetchUser = function (next, req, res, uid, cred, info) {
              this.oauth.getProtectedResource(this._apiHost + '/me', cred.accessToken, function (err, data, response) {
                info = JSON.parse(data);
                next(req, res, uid, cred, info);
              });
            };
          } else { // Turn off fetchOAuthUser
            if (strategy._cachedPreFetchUser) {
              strategy._cachedPreFetchUser = null;
            }
          }
        }
      , 'routeApp': function (strategy) {
          strategy.oauth = new OAuth(strategy._appId, strategy._appSecret, strategy._apiHost);
        }
    }
  })
  .authTimeout(3000)
  .fetchOAuthUser(true);
