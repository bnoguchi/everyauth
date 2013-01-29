var oauthModule = require('./oauth2'),
    request = require('request');

var box2 = module.exports =
oauthModule.submodule('box2')

  .oauthHost('https://api.box.com')
  .apiHost('https://api.box.com')

  .authPath('/oauth2/authorize')
  .authQueryParam('response_type', 'code')

  .accessTokenPath('/oauth2/token')
  .accessTokenParam('grant_type', 'authorization_code')
  .accessTokenHttpMethod('post')
  .postAccessTokenParamsVia('data')

  .entryPath('/auth/box2')
  .callbackPath('/auth/box2/callback')

  .authQueryParam('scope', function () {
    return this._scope && this.scope();
  })

  .fetchOAuthUser( function (accessToken) {
    var p = this.Promise();

    request.get({
      url: this.apiHost() + '/2.0/users/me',
      headers: {'Authorization': 'Bearer ' + accessToken}
    }, function(err, res, body){
      if(err) {
        return p.fail(err);
      } else {
        if(parseInt(res.statusCode/100,10) !==2){
          return p.fail({extra:{data:body, res: res}});
        }
        p.fulfill(JSON.parse(body));
      }
    });

    return p;
  })
  .moduleErrback( function (err, seqValues) {
    if (err instanceof Error) {
      var next = seqValues.next;
      return next(err);
    } else if (err.extra) {
      var box2Response = err.extra.res, 
          serverResponse = seqValues.res;
      serverResponse.writeHead(
          box2Response.statusCode, 
          box2Response.headers);
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
