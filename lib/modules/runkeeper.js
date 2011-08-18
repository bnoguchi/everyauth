var oauthModule = require('./oauth2')
  , rest = require('../restler');

var runkeeper = module.exports =
oauthModule.submodule('runkeeper')

  .oauthHost('https://runkeeper.com/apps')
  .apiHost('https://api.runkeeper.com')

  .authPath('/authorize')
  .accessTokenPath('/token')

  .entryPath('/auth/runkeeper')
  .callbackPath('/auth/runkeeper/callback')

  .authQueryParam('response_type', 'code')

  .accessTokenParam('grant_type', 'authorization_code')

  .fetchOAuthUser( function(accessToken) {
	var promise = this.Promise();
	var oauthUser = {};
	var rest_req = rest.get(this.apiHost() + '/user',
		{
			headers: {
				"Accept": "application/vnd.com.runkeeper.User+json",
				"Authorization": "Bearer " + accessToken
			}
		}).on('success', function(data, res) {
			
			oauthUser = JSON.parse(data);
			oauthUser.id = oauthUser.userID;
			
			var rest_req_profile = rest.get(runkeeper.apiHost() + oauthUser.profile,
			{
				headers: {
					"Accept": "application/vnd.com.runkeeper.Profile+json",
					"Authorization": "Bearer " + accessToken
				}
			}).on('success', function(data, res) {
				var userTmp = JSON.parse(data);
				// Add Profile Data to User Array
				for(var i in userTmp){
					oauthUser[i] = userTmp[i];
				}
				oauthUser.accessToken = accessToken;
				promise.fulfill(oauthUser);
			}).on('error', function(data, res) {
				promise.fail(data)
			});
			
		}).on('error', function(data, res) {
			promise.fail(data)
		});
	return promise;
  });