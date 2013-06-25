var oauthModule = require('./oauth2'),
    url = require('url'),
    request = require('request');

var surveymonkey = module.exports =
oauthModule.submodule('surveymonkey')

  .configurable({
    client_id: "Set this to your client_id.  Defaults to none"
  })

  .oauthHost('https://api.surveymonkey.net')
  .apiHost('https://api.surveymonkey.net')

  //Set up Auth Path - requires client_id
  .authPath('/oauth/authorize')
  .authQueryParam('response_type', 'code')
  .authQueryParam('client_id', function () {
    return this._client_id && this.client_id();
  })

  //Set up access Token path - requires client_id and client_secret (which is really your api key)
  .accessTokenPath('/oauth/token')
  .accessTokenParam('grant_type', 'authorization_code')
  .accessTokenParam('client_id', function() {
    return this._client_id && this.client_id();
  })
  .accessTokenParam('client_secret', function() {
    return this._appId && this.appId();
  })
  .accessTokenHttpMethod('post')
  .postAccessTokenParamsVia('data')

  .entryPath('/auth/surveymonkey')
  .callbackPath('/auth/surveymonkey/callback')

  .authCallbackDidErr( function (req) {
    var parsedUrl = url.parse(req.url, true);
    return parsedUrl.query && !!parsedUrl.query.error;
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

  //With SurveyMonkey - there isn't an api call to fetch info on the user - all we get is the access token
  .fetchOAuthUser( function (accessToken, authResponse) {
    return authResponse.code;
  })

  .moduleErrback( function (err, seqValues) {
    if (err instanceof Error) {
      var next = seqValues.next;
      return next(err);
    } else if (err.extra) {
      var surveymonkeyResponse = err.extra.res, 
          serverResponse = seqValues.res;
      serverResponse.writeHead(
          surveymonkeyResponse.statusCode, 
          surveymonkeyResponse.headers);
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
