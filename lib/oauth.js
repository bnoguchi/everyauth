var everyModule = require('./everymodule')
  , OAuth = require('oauth').OAuth2
  , url = require('url');

// facebook, twitter, and other OAuth2-dependent modules
// inherit from this

var oauthModule = module.exports = everyModule.submodule({
    setters: 'apiHost appId appSecret authTimeout callbackUri autoFetchUser myHostname'
  , on: {
        'set.callbackUri': function (strategy, uri) {
          strategy.routes.get[uri] = function (req, res) {
            var parsedUrl = url.parse(req.url, true);
            if (parsedUrl.query && parsedUrl.query.code) {
              strategy.oauth.getOAuthAccessToken(
                  parsedUrl.query.code
                , {redirect_uri: uri} 
                , function (err, accessToken, refreshToken) {
                    if (err) return strategy.emit('auth.fail', err);
                    strategy.emit('oauth.access-token', 
                              req, accessToken, refreshToken);
                    strategy.emit('auth.succeed', req, res);
                  });
            }
          };
          if (this.oauthAccessTokenListener)
            this.removeListener('oauth.access-token', this.oauthAccessTokenListener);
          this.on('oauth.access-token', this.oauthAccessTokenListener = function (req, accessToken, refreshToken) {
            req.session['access_token'] = accessToken;
            if (refreshToken) req.session['refresh_token'] = refreshToken;
          });
        }
      , 'routeApp': function (strategy) {
          this.oauth = new OAuth(strategy._appId, this._appSecret, this._apiHost);
        }
    }
  })
  .authTimeout(3000)
  .autoFetchUser(true);
