var facebook = require('./facebook')
    , crypto = require('crypto');

var fb = module.exports =
  facebook.submodule("facebookCanvas")
  .configurable({
      canvasPage: 'specify the URL configured for your Facebook Canvas Page via https://developers.facebook.com/apps/' 
  })
  .post('canvasPath',
       'the path configured for the Facebook canvas interface ("Canvas URL"), minus the hostname')
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

  .canvasPath('/auth/facebook/canvas')

  .fetchOAuthUserFromSignedRequest( function (req, res) {
    var signed_request = req.param('signed_request').split('.');
    var signature = signed_request[0].replace(/_/g, '/').replace(/-/g, '+');
    var data = signed_request[1];
    var decoded = new Buffer(data, 'base64').toString('utf8');
    var oauthUser = JSON.parse(decoded);

    if (oauthUser.algorithm !== 'HMAC-SHA256') {
      return this.breakTo('authCallbackErrorSteps', req, res);
    }

    var calculated = crypto.createHmac('sha256', this._appSecret).update(data).digest('base64');
    if (calculated != signature+"=") {
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
    var authUri = "http://www.facebook.com/dialog/oauth?client_id="+ this._appId + "&redirect_uri=" + encodeURI(this._canvasPage);
    return authUri;
  });
