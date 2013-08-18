var oauthModule = require('./oauth'),
    url = require('url');

var desk = module.exports =
oauthModule.submodule('desk')
  // oauthHost & apiHost set at runtime, since they depend on the site prefix endpoint
  .configurable({
    apiHost: 'https://SITE_PREFIX.desk.com/',
    oauthHost: 'https://SITE_PREFIX.desk.com/'
  })

  .requestTokenPath('/oauth/request_token')
  .accessTokenPath('/oauth/access_token')
  .authorizePath('/oauth/authorize')
  .entryPath('/auth/desk')
  .callbackPath('/auth/desk/callback')

  .authCallbackDidErr( function (req) {
    var parsedUrl = url.parse(req.url, true);
    return parsedUrl.query && !!parsedUrl.query.not_approved;
  })

  .handleAuthCallbackError( function (req, res) {
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

  .fetchOAuthUser( function (accessToken, accessTokenSecret, params) {
    var p = this.Promise();
    this.oauth.get(this.apiHost() + '/account', accessToken, accessTokenSecret, function (err, data) {
      if (err) return p.fail(err);
      var oauthUser = JSON.parse(data);
      oauthUser.id = oauthUser.uid;
      p.fulfill(oauthUser);
    });
    return p;
  })

  .moduleErrback( function (err, seqValues) {
    if (err instanceof Error) {
      var next = seqValues.next;
      return next(err);
    } else if (err.extra) {
      var deskResponse = err.extra.res,
          serverResponse = seqValues.res;
      serverResponse.writeHead(
          deskResponse.statusCode,
          deskResponse.headers);
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
