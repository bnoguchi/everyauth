var oauthModule = require('./oauth')
  , OAuth = require('oauth').OAuth;

var linkedin = module.exports =
oauthModule.submodule('linkedin')
  .definit( function () {
    this.oauth = new OAuth(
        this.oauthHost() + this.requestTokenPath()
      , this.oauthHost() + this.accessTokenPath()
      , this.consumerKey()
      , this.consumerSecret()
      , '1.0', null, 'HMAC-SHA1', null
      , {
            Accept: '/'
          , Connection: 'close'
          , 'User-Agent': 'Node authentication'
          , 'x-li-format': 'json' // So we get JSON responses
        });
  })

  .apiHost('https://api.linkedin.com/v1')
  .oauthHost('https://api.linkedin.com')

  .requestTokenPath('/uas/oauth/requestToken')
  .authorizePath('/uas/oauth/authenticate')
  .accessTokenPath('/uas/oauth/accessToken')

  .entryPath('/auth/linkedin')
  .callbackPath('/auth/linkedin/callback')

  .redirectToProviderAuth( function (res, token) {
    this.redirect(res, 'https://www.linkedin.com' + this.authorizePath() + '?oauth_token=' + token);
  })

  .fetchOAuthUser( function (accessToken, accessTokenSecret, params) {
    var promise = this.Promise();
    this.oauth.get(this.apiHost() + '/people/~:(id,first-name,last-name,headline,location:(name,country:(code)),industry,num-connections,num-connections-capped,summary,specialties,proposal-comments,associations,honors,interests,positions,publications,patents,languages,skills,certifications,educations,three-current-positions,three-past-positions,num-recommenders,recommendations-received,phone-numbers,im-accounts,twitter-accounts,date-of-birth,main-address,member-url-resources,picture-url,site-standard-profile-request:(url),api-standard-profile-request:(url,headers),public-profile-url)', accessToken, accessTokenSecret, function (err, data) {
      if (err) return promise.fail(err);
      var oauthUser = JSON.parse(data);
      promise.fulfill(oauthUser);
    });
    return promise;
  })
  .convertErr( function (data) {
//    var errJson = JSON.parse(data.data)
//      , errMsg = errJson.message;
    var errMsg = data.data;
    return new Error("LinkedIn sent back a " + data.statusCode + " response with data = " + errMsg);
  });
