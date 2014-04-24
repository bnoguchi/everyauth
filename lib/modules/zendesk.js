var oauthModule = require('./oauth2'),
    request = require('request'),
    url = require('url');

var zendesk = module.exports =
oauthModule.submodule('zendesk')
  .configurable({
    domain: "URL identifying domain for the api",
    scope: "Zendesk scope values, either read or write or both."
  })
  .apiHost('https://something.zendesk.com/api/v2')
  .oauthHost('https://somthing.zendesk.com')

  .authPath('/oauth/authorizations/new')
  .accessTokenPath('/oauth/tokens')
  .accessTokenParam('grant_type', 'authorization_code')

  .entryPath('/auth/zendesk')
  .callbackPath('/auth/zendesk/callback')

  .fetchOAuthUser( function (accessToken) {
    var p = this.Promise(),
        url = this._apiHost() + '/users/me.json',
        headers = {'Authorization': 'Bearer ' + accessToken};

    request.get({
      url: url,
      headers: headers
    }, function(err, data, body){
      if (err) return p.fail(err);
      var oauthUser = JSON.parse(body).user;
      p.fulfill(oauthUser);
    });

    return p;
  })

  .authCallbackDidErr( function (req) {
    var parsedUrl = url.parse(req.url, true);
    return parsedUrl.query && !!parsedUrl.query.not_approved;
  })

  .handleAuthCallbackError( function (req, res, next) {
    var parsedUrl = url.parse(req.url, true),
        errorDesc = parsedUrl.query.error + "; " + parsedUrl.query.error_description;
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
      var zendeskResponse = err.extra.res,
          serverResponse = seqValues.res;
      serverResponse.writeHead(
          zendeskResponse.statusCode,
          zendeskResponse.headers);
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
