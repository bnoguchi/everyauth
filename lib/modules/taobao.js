var oauthModule = require('./oauth2')
  , request = require('request');

module.exports =
oauthModule.submodule('taobao')
  .configurable({
      scope: 'specify types of access: item,, promotion, usergrade'
  })
  .apiHost('https://eco.taobao.com/')

  .oauthHost('https://oauth.taobao.com')
  .authPath('/authorize')
  .accessTokenPath('/token')

  .authQueryParam('response_type', 'code')
  .authQueryParam('scope', function () {
    return this._scope && this.scope();
  })

  .accessTokenParam('grant_type', 'authorization_code')
  .postAccessTokenParamsVia('data')

  .entryPath('/auth/taobao')
  .callbackPath('/auth/tb/callback')

  .fetchOAuthUser( function (accessToken) {
    var p = this.Promise();
    request.get({
      url: this.apiHost() + '/router/rest?method=taobao.user.get&v=2.0&fields=user_id,uid,nick,sex&access_token=' + accessToken
    }, function (err, res, data) {
      if (err) return p.fail(err);
      var oauthUser = JSON.parse(data);
      p.fulfill(oauthUser);
    });
    return p;
    p.fulfill(oauthUser);
    return p;
  })

  .moduleErrback( function (err, seqValues) {
    if (err instanceof Error) {
      var next = seqValues.next;
      return next(err);
    } else if (err.extra) {
      var ghResponse = err.extra.res
        , serverResponse = seqValues.res;
      serverResponse.writeHead(
          ghResponse.statusCode
        , ghResponse.headers);
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
