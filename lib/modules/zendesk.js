var oauthModule = require('./oauth'),
    url = require('url');

var zendesk = module.exports =
oauthModule.submodule('zendesk')
  .configurable({
    domain: "URL identifying domain for the api",
    scope: "Zendesk scope values, either read or write or both."
  })
  .apiHost('https://something.zendesk.com/api/v2')
  .oauthHost('https://somthing.zendesk.com')

  .authorizePath('/oauth/authorizations/new')
  .authorizeQueryParam('response_type', 'code')
  .authorizeQueryParam('scope', 'read')

  .requestTokenPath('/oauth/tokens')
  .accessTokenPath('/oauth/access_token')

  .entryPath('/auth/zendesk')
  .callbackPath('/auth/zendesk/callback')

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

  .fetchOAuthUser( function (accessToken, authResponse) {
    var p = this.Promise();

    request.get({
      url: this.apiHost() + '/users/me',
      headers: {'Authorization': 'Bearer ' + accessToken}
    }, function(err, res, body) {
      if(err){
        return p.fail(err);
      } else {
        if(parseInt(res.statusCode/100,10) !=2) {
          return p.fail({extra:{data:body, res: res}});
        }
        var oAuthUser = JSON.parse(body);
        p.fulfill(oAuthUser);
      }
    });
    return p;
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
