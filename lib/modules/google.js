var oauthModule = require('./oauth2')
  , url = require('url')
  , rest = require('../restler');

var google = module.exports =
oauthModule.submodule('google')
  .configurable({
      scope: "URL identifying the Google service to be accessed. See the documentation for the API you'd like to use for what scope to specify. To specify more than one scope, list each one separated with a space."
  })

  .oauthHost('https://accounts.google.com')
  .apiHost('https://www.google.com/m8/feeds')

  .authPath('/o/oauth2/auth')
  .authQueryParam('response_type', 'code')

  .accessTokenPath('/o/oauth2/token')
  .accessTokenParam('grant_type', 'authorization_code')
  .accessTokenHttpMethod('post')
  .postAccessTokenParamsVia('data')

  .entryPath('/auth/google')
  .callbackPath('/auth/google/callback')

  .authQueryParam('scope', function () {
    return this._scope && this.scope();
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
  .convertErr( function (data) {
    return new Error(data.data.match(/H1>(.+)<\/H1/)[1]);
  })

  .fetchOAuthUser( function (accessToken) {
    var promise = this.Promise();
    rest.get('https://www.googleapis.com/oauth2/v1/userinfo', {
      query: { oauth_token: accessToken, alt: 'json' }
    }).on('success', function (data, res) {
      promise.fulfill(data);
    }).on('error', function (data, res) {
      promise.fail(data);
    });
    return promise;
  });
