var oauthModule = require('./oauth2'),
    rest = require('../restler');

var mailchimp = module.exports =
oauthModule.submodule('mailchimp')
  .configurable({
    metadataPath: "Although this shouldn't be changed, this is where we get the datacenter for building the API key."
  })
  .oauthHost('https://login.mailchimp.com')
  .authPath('/oauth2/authorize')
  .accessTokenPath('/oauth2/token')
  .metadataPath('/oauth2/metadata')

  .entryPath('/auth/mailchimp')
  .callbackPath('/auth/mailchimp/callback')
  .fetchOAuthUser( function (accessToken) {
    var p = this.Promise();
    this.oauth._request("GET", this.oauthHost() + this.metadataPath(), {
      Authorization: 'OAuth ' + accessToken
    },"","",function(error,data){
      if (error) return p.fail(error);
      
      var metadata = JSON.parse(data);
      var apikey = accessToken + "-"+ metadata.dc;
      
      rest.post(metadata.api_endpoint + '/1.3/?method=getAccountDetails',
        {data:{apikey: apikey}})
        
      .on('success',function(user,response){
        user.apikey = apikey;
        p.fulfill(user);
      })
      
      .on('error',function(err){
        p.fail(err);
      });
    });
  
    return p;
  })
  .postAccessTokenParamsVia("data")
  .authQueryParam('response_type','code')
  .accessTokenParam('grant_type','authorization_code')