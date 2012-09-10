var oauthModule = require('./oauth2')
  , request = require('request');

module.exports =
oauthModule.submodule('douban')
  .configurable({
      scope: 'specify types of access: (no scope), douban_basic_common, shuo_basic_r, shuo_basic_w..'
  })
  .apiHost('https://api.douban.com/')

  .oauthHost('https://www.douban.com')
  .authPath('/service/auth2/auth')
  .accessTokenPath('/service/auth2/token')

  .authQueryParam('response_type', 'code')
  .authQueryParam('scope', function () {
    return this._scope && this.scope();
  })

  .accessTokenParam('grant_type', 'authorization_code')
  .postAccessTokenParamsVia('data')

  .entryPath('/auth/douban')
  .callbackPath('/auth/douban/callback')

  .fetchOAuthUser( function (accessToken) {
    var p = this.Promise();
    request.get({
        url: this.apiHost() + '/v2/user/~me'
      , headers: {
            Authorization: 'Bearer ' + accessToken
        }
    }, function (err, res, data) {
      if (err) return p.fail(err);
      var oauthUser = JSON.parse(data);
      p.fulfill(oauthUser);
    });
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
