var oauthModule = require('./oauth')
  , rest = require('restler');

	var readability = module.exports =
	oauthModule.submodule('readability')
	
	.apiHost('https://www.readability.com/api/rest/v1')
  .oauthHost('https://www.readability.com')

  .requestTokenPath('/api/rest/v1/oauth/request_token')
  .authorizePath('/api/rest/v1/oauth/authorize')
  .accessTokenPath('/api/rest/v1/oauth/access_token')  

  .entryPath('/auth/readability')
  .callbackPath('/auth/readability/callback')
  
  .redirectToProviderAuth( function (res, token) {
    res.writeHead(303, { 'Location': 'https://www.readability.com' + this.authorizePath() + '?oauth_token=' + token });
    res.end();
  })

  .fetchOAuthUser( function (accessToken) {
    var p = this.Promise();
    this.oauth.get(this.apiHost() + '/users', accessToken, function (err, data) {
      if (err) return p.fail(err.error_message);
      var oauthUser = JSON.parse(data).data;
      p.fulfill(oauthUser);
    })
    return p;
  })
  .convertErr( function (data) {
    return new Error(data.error_message);
  });
  