var oauthModule = require('./oauth')
  , querystring = require('querystring')
  , xml2js = require('xml2js');

var netflix = module.exports =
oauthModule.submodule('netflix')
  .apiHost('http://api.netflix.com')
  .oauthHost('http://api.netflix.com')
  
  // abnormal authorize URI
  .authorizePath('https://api-user.netflix.com/oauth/login') 
  
  .entryPath('/auth/netflix')
  .callbackPath('/auth/netflix/callback')
// ?oauth_token=uh5g3j69prfze4f7k9q2mm3e&oauth_verifier=

  .getAccessToken( function (reqToken, reqTokenSecret, verifier) {
    var promise = this.Promise()
      , extraParams = {
          consumer_key: this._consumerKey
          , consumer_secret: this._consumerSecret
        };
    this.oauth._performSecureRequest(reqToken, reqTokenSecret, "POST", this._apiHost + this._accessTokenPath, extraParams, null, null, function(error,data,res){
      if( error ) promise.fail(error);
      else {
        var results= querystring.parse( data );
        var oauth_access_token= results["oauth_token"];
        delete results["oauth_token"];
        var oauth_access_token_secret= results["oauth_token_secret"];
        delete results["oauth_token_secret"];
        promise.fulfill(oauth_access_token, oauth_access_token_secret, results)
      }
    });
    return promise;
  })
  
  .fetchOAuthUser( function (accessToken, accessTokenSecret, params) {
    var promise = this.Promise()
      , parser = new xml2js.Parser();
    parser.addListener('end', function(data){
      return promise.fulfill(data);
    });
    this.oauth.get(this.apiHost() + '/users/'+params.user_id, accessToken, accessTokenSecret, function (err, data) {
      if (err) return promise.fail(err);
      return parser.parseString(data);
    });
    return promise;
  });
