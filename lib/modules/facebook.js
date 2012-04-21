var oauthModule = require('./oauth2')
  , url = require('url');

var fb = module.exports =
oauthModule.submodule('facebook')
  .configurable({
      scope: 'specify types of access: See http://developers.facebook.com/docs/authentication/permissions/',
      fields: 'specify returned fields: See http:/developers.facebook.com/docs/reference/api/user/',
      canvasPage: 'specify the URL configured for your Facebook Canvas Page via https://developers.facebook.com/apps/' 
  })

  .apiHost('https://graph.facebook.com')
  .oauthHost('https://graph.facebook.com')

  .authPath('https://www.facebook.com/dialog/oauth')

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
    var fieldsQuery = "";
    if (this.fields() && this.fields().length > 0){
        fieldsQuery = "?fields=" + this.fields();
    }
    this.oauth.get(this.apiHost() + '/me' + fieldsQuery, accessToken, function (err, data) {
      if (err)
        return p.fail(err);
      var oauthUser = JSON.parse(data);
      p.fulfill(oauthUser);
    })
    return p;
  })
  .convertErr( function (data) {
    return new Error(JSON.parse(data.data).error.message);
  })

  .post('canvasPath',
       'the path configured for the Facebook canvas interface ("Canvas URL")')
    .step('fetchOAuthUserFromSignedRequest')
      .description('handles the signed request from Facebook and returns the oauth user')
      .accepts('req res')
      .promises('oauthUser accessToken extra')
      .canBreakTo('authCallbackErrorSteps')
      .canBreakTo('requestAuthorizationSteps')
    .step('getSession')
     .accepts('req')
      .promises('session')
    .step('findOrCreateUser')
      .accepts('session accessToken extra oauthUser')
      .promises('user')
    .step('compile')
      .accepts('accessToken extra oauthUser user')
      .promises('auth')
    .step('addToSession')
      .accepts('session auth')
      .promises(null)
    .step('sendResponse')
      .accepts('res')
      .promises(null)

  .fetchOAuthUserFromSignedRequest( function (req, res) {
    var signed_request = req.param('signed_request').split('.');
    var signature = signed_request[0];
    var data = signed_request[1];
    var decoded = new Buffer(data, 'base64').toString('utf8');
    var oauthUser = JSON.parse(decoded);

    // TODO: compare decoded signature to SHA256-encoded signed_request
    // See PHP example: http://developers.facebook.com/docs/authentication/signed_request/
    if (oauthUser.algorithm !== 'HMAC-SHA256') {
      return this.breakTo('authCallbackErrorSteps', req, res);
    }

    if (!oauthUser.user_id || oauthUser.user_id === null) {
      // Need to get authorization first
      return this.breakTo('requestAuthorizationSteps', req, res);
    }

    // Dummy values used to satisfy subsequent steps
    var accessToken = "access_token";
    var extra = "extra";

    var p = this.Promise();
    p.fulfill(oauthUser, accessToken, extra);
    return p;
  })

  .stepseq('requestAuthorizationSteps')
    .step('getCanvasAuthUri')
      .accepts('req res')
      .promises('authUri')
    .step('requestAuthUri')
      .accepts('res authUri')
      .promises(null)

  .getCanvasAuthUri( function (req, res) {
    // TODO: verify configuration of params
    // TODO: pass on querystring params
    var authUri = "http://www.facebook.com/dialog/oauth?client_id="+ this._appId + "&redirect_uri=" + encodeURI(this._canvasPage);
    return authUri;
  });


fb.mobile = function (isMobile) {
  if (isMobile) {
    this.authPath('https://m.facebook.com/dialog/oauth');
  }
  return this;
};
