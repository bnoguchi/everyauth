var oauthModule = require('./oauth2')
  , url = require('url');

var fb = module.exports =
oauthModule.submodule('facebook')
  .configurable({
      scope: 'specify types of access: See http://developers.facebook.com/docs/authentication/permissions/',
      fields: 'specify returned fields: See http:/developers.facebook.com/docs/reference/api/user/',
      returnSSLResources: 'indicates whether to return url resources with https prefix (to avoid mixed content warning in https sites)'
  })

  .apiHost('https://graph.facebook.com/v2.0')
  .oauthHost('https://graph.facebook.com/v2.0')

  .authPath('https://www.facebook.com/v2.0/dialog/oauth')

  .entryPath('/auth/facebook')
  .callbackPath('/auth/facebook/callback')

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
    var p = this.Promise();
    var query = {};
    if (this.fields() && this.fields().length > 0){
      query.fields = this.fields();
    }
    if (this.returnSSLResources()){
      query.return_ssl_resources = this.returnSSLResources();
    }
    this.oauth.get(this.apiHost() + '/me' + url.format({ query: query }), accessToken, function (err, data) {
      if (err) return p.fail(err);
      var oauthUser = JSON.parse(data);
      p.fulfill(oauthUser);
    })
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
    this.authPath('https://m.facebook.com/v2.0/dialog/oauth');
  }
  return this;
};

fb.popup = function (isPopup) {
  if (isPopup) {
    this.authQueryParam('display', 'popup');
  }
  return this;
};
