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
  .authQueryParam('api_key', function() {
    return this._appId && this.appId();
  })

  //Set up access Token path - requires client_id and client_secret
  .accessTokenPath('/oauth/token')
  .accessTokenQueryParam('api_key', function() {
    return this._appId && this.appId();
  })
  .accessTokenParam('grant_type', 'authorization_code')
  .accessTokenParam('client_id', function() {
    return this._client_id && this.client_id();
  })
  .accessTokenParam('client_secret', function() {
    return this._appSecret && this.appSecret();
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
    var p = this.Promise();

    request.post({
      url: this.apiHost() + '/v2/user/get_user_details?api_key=' + this.appId(),
      headers: {'Authorization': 'bearer ' + accessToken}
    }, function(err, res, body) {
        if(err) {
          return p.fail(err);
        } else {

          //Suverymonkey sends back errors in the status code - not as non 200 responses
          if(body) {
            body = JSON.parse(body);
          } else {
            body.status = 1;
          }

          if(parseInt(res.statusCode/100, 10) !== 2 || body.status !== 0) {
            return p.fail({extra:{data:body, res: res}});
          }
          var oAuthUser = body;
          oAuthUser.code = authResponse.code;
          p.fulfill(oAuthUser);
        }
    });
    //return authResponse.code;
    return p;
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
