var oauthModule = require('./oauth2')
  , url = require('url')
  , request = require('request');

var microsoft = module.exports =
oauthModule.submodule('microsoft')
  .configurable({
      scope: "URL identifying the Microsoft service to be accessed. See the documentation for the API you'd like to use for what scope to specify. To specify more than one scope, list each one separated with a space.",
      display: "The display type used for the authentication page.  Valid values are: 'popup', 'touch', 'page', 'none'",
      locale: "Optional - A market string that determines how the consent UI is localized.  Defaults to autodetect"
  })

  .oauthHost('https://login.live.com')
  .apiHost('https://apis.live.net')

  .authPath('/oauth20_authorize.srf')
  .authQueryParam('response_type', 'code')

  .accessTokenPath('/oauth20_token.srf')
  .accessTokenParam('grant_type', 'authorization_code')
  .accessTokenHttpMethod('post')
  .postAccessTokenParamsVia('data')

  .entryPath('/auth/microsoft')
  .callbackPath('/auth/microsoft/callback')

  .authQueryParam({
    display: function() {
      return this._display && this.display();
    },
    locale: function () {
      return this._locale && this.locale();
    },
    scope: function () {
      return this._scope && this.scope();
    }
  })

  .addToSession( function (sess, auth) {
    this._super(sess, auth);
    if (auth.refresh_token) {
      sess.auth[this.name].refreshToken = auth.refresh_token;
      sess.auth[this.name].expiresInSeconds = parseInt(auth.expires_in, 10);
    }
  })

  .authCallbackDidErr( function (req) {
    var parsedUrl = url.parse(req.url, true);
    return parsedUrl.query && !!parsedUrl.query.error;
  })

  .handleAuthCallbackError( function (req, res) {
    var parsedUrl = url.parse(req.url, true)
      , errorDesc = parsedUrl.query.error + "; " + parsedUrl.query.error_description;
    if (res.render) {
      res.render(__dirname + '/../views/auth-fail.jade', {
        errorDescription: errorDesc
      });
    } else {
      // TODO Replace this with a nice fallback
      throw new Error("You must configure handleAuthCallbackError if you are not using express");
    }
  })
  .moduleErrback( function (err, seqValues) {
    if (err instanceof Error) {
      var next = seqValues.next;
      return next(err);
    } else if (err.extra) {
      var microsoftResponse = err.extra.res
        , serverResponse = seqValues.res;
      serverResponse.writeHead(
          microsoftResponse.statusCode
        , microsoftResponse.headers);
      serverResponse.end(err.extra.data);
    } else if (err.statusCode) {
      var serverResponse = seqValues.res;
      serverResponse.writeHead(err.statusCode);
      serverResponse.end(err.data);
    } else {
      console.error(err);
      throw new Error('Unsupported error type');
    }
  })

  .fetchOAuthUser( function (accessToken, authResponse) {
    var p = this.Promise();

    request.get({
      url: this.apiHost() + '/v5.0/me',
      qs: {access_token: accessToken}
    }, function(err, res, body) {
      if(err){
        return p.fail(err);
      } else {
        if(parseInt(res.statusCode/100,10) !== 2) {
          return p.fail({extra:{data:body, res: res}});
        }
        var oAuthUser = JSON.parse(body);
        p.fulfill(oAuthUser);
      }
    });
    return p;
  });

/**
 * @param {Object} params in an object that includes the keys:
 * - refreshToken: The refresh token returned from the authorization code
 *   exchange
 * - clientId: The client_id obtained during application registration
 * - clientSecret: The client secret obtained during the application registration
 * @param {Function} cb
 */
microsoft.refreshToken = function (params, cb) {
  request.post('https://login.live.com/oauth20_token.srf', {
    form: {
      refresh_token: params.refreshToken
    , client_id: params.clientId
    , client_secret: params.clientSecret
    , grant_type: 'refresh_token'
    }
  }, function (err, res, body) {
    // `body` should look like:
    // {
    //   "access_token":"1/fFBGRNJru1FQd44AzqT3Zg",
    //   "expires_in":3920,
    //   "token_type":"Bearer",
    // }
    if (err) return cb(err);
    if (parseInt(res.statusCode / 100, 10) !== 2) {
      cb(null, {}, res);
    } else {
      body = JSON.parse(body);
      cb(null, {
        accessToken: body.access_token
      , expiresIn: body.expires_in
      , idToken: body.id_token
      }, res);
    }
  });
  return this;
};
