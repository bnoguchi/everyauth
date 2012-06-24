var oauthModule = require('./oauth2')
  , url = require('url')
  , request = require('request');

var healthgraph = module.exports =
oauthModule.submodule('healthgraph')

  .oauthHost('https://runkeeper.com')
  .apiHost('https://api.runkeeper.com')

  .authPath('/apps/authorize')
  .authQueryParam('response_type', 'code')

  .accessTokenPath('/apps/token')
  .accessTokenParam('grant_type', 'authorization_code')
  .accessTokenHttpMethod('post')
  .postAccessTokenParamsVia('data')

  .entryPath('/auth/healthgraph')
  .callbackPath('/auth/healthgraph/callback')

  .authQueryParam({
      access_type: 'offline'
    , approval_prompt: 'force'
    , scope: function () {
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
      var healthGraphResponse = err.extra.res
        , serverResponse = seqValues.res;
      serverResponse.writeHead(
          healthGraphResponse.statusCode
        , healthGraphResponse.headers);
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

  .fetchOAuthUser( function (accessToken) {
    var promise = this.Promise()
      , userUrl = this.apiHost() + "/user"
      , queryParams = { access_token: accessToken }
      , profileQueryParams = queryParams
      , apiHost = this.apiHost();

    request.get({
        url: userUrl
      , qs: queryParams
    }, function (err, res, body) {
      if (err) return promise.fail(err);
      if (parseInt(res.statusCode/100, 10) !== 2) {
        return promise.fail({extra: {data: body, res: res}});
      }
      var userMeta = JSON.parse(body)
        , profileUrl = apiHost + "/" + (userMeta.profile || "profile");

      request.get({
        url: profileUrl,
        qs: profileQueryParams
      }, function (err, res, body) {
        if (parseInt(res.statusCode/100, 10) !== 2) {
          return promise.fail({extra: {data: body, res: res}});
        }
        var userObj = JSON.parse(body);
        //attach id from /user as /profile doesn't have it
        userObj.id = userMeta.userID;
        promise.fulfill(userObj);
      })
    });
    return promise;
  });
