var oauthModule = require('./oauth2')
  , url = require('url');

var paypal = module.exports =
oauthModule.submodule('paypal')
  .configurable({
      scope: 'specify types of access: See https://developer.paypal.com/docs/integration/direct/identity/attributes/'
  })

  .oauthHost('https://www.paypal.com')
  .apiHost('https://api.paypal.com')

  .authPath('/webapps/auth/protocol/openidconnect/v1/authorize')
  .authQueryParam('response_type', 'code')

  // See line 158 in oauth2.js for reason to include the entire url here 

  // Use oAuth request to retrive an acces toekn for use with api calls 
  .accessTokenPath(this._apiHost() + 'v1/oauth2/token')

  // (Identity) Grant token from authorization code
  .accessTokenPath(this._apiHost() + 'v1/identity/openidconnect/tokenservice')

  .accessTokenParam('grant_type', 'client_credentials')
  .accessTokenHttpMethod('post')
  .postAccessTokenParamsVia('data')

  .entryPath('/auth/paypal')
  .callbackPath('/auth/paypal/callback')

  .authQueryParam('scope', function () {
    return this._scope && this.scope();
  })

  .authCallbackDidErr( function (req) {
    var parsedUrl = url.parse(req.url, true);
    return parsedUrl.query && !!parsedUrl.query.error;
  })
  .handleAuthCallbackError( function (req, res) {
    var parsedUrl = url.parse(req.url, true)
      , errorDesc = parsedUrl.query.error_description;
    if (res.render) {
      res.render(__dirname + '/../views/auth-fail.jade', {
        errorDescription: errorDesc
      });
    } else {
      // TODO Replace this with a nice fallback
      throw new Error("You must configure handleAuthCallbackError if you are not using express");
    }
  })

  .fetchOAuthUser( function (accessToken) {
    var p = this.Promise(),
        url = this._apiHost() + '/v1/identity/openidconnect/userinfo/?schema=openid',
        headers = {'Authorization': 'Bearer ' + accessToken},
        queryParams = '?schema=openid';

    request.get({
      url: url + queryParams,
      headers: headers
    }, function(err, data, body) {
      if (err) return p.fail(err);
      var oauthUser = JSON.parse(body).user;
      p.fulfill(oauthUser);
    });

    return p;
  })


  .moduleErrback( function (err, seqValues) {
    if (err instanceof Error) {
      var next = seqValues.next;
      return next(err);
    } else if (err.extra) {
      var facebookResponse = err.extra.res
        , serverResponse = seqValues.res;
      serverResponse.writeHead(
          facebookResponse.statusCode
        , facebookResponse.headers);
      serverResponse.end(err.extra.data);
    } else if (err.statusCode) {
      var serverResponse = seqValues.res;
      serverResponse.writeHead(err.statusCode);
      serverResponse.end(err.data);
    } else {
      console.error(err);
      throw new Error('Unsupported error type');
    }
  });

fb.mobile = function (isMobile) {
  if (isMobile) {
    this.authPath('https://m.facebook.com/dialog/oauth');
  }
  return this;
};

fb.popup = function (isPopup) {
  if (isPopup) {
    this.authQueryParam('display', 'popup');
  }
  return this;
};
