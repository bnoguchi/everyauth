var openidModule = require('./openid')
  , OAuth = require('oauth').OAuth
  , oid = require('openid')
  , extractHostname = require('../utils').extractHostname;

var yahoohybrid = module.exports =
openidModule.submodule('yahoohybrid')
  .configurable({
       consumerKey: 'Consumer Key'
     , consumerSecret: 'Consumer Secret'
  })
  .definit( function () {
    this.relyingParty =
      new oid.RelyingParty(this._myHostname + this._callbackPath, null, false, false, [
          new oid.AttributeExchange({
              'http://axschema.org/contact/email': 'required'
            , 'http://axschema.org/namePerson/first': 'required'
            , 'http://axschema.org/namePerson/last': 'required'
            , 'http://axschema.org/namePerson': 'required'
          })
        , new oid.OAuthHybrid({
              consumerKey: this._consumerKey
          })
      ]);

    this.oauth = new OAuth(
          "https://api.login.yahoo.com/oauth/v2/get_request_token"
        , "https://api.login.yahoo.com/oauth/v2/get_token"
        , this.consumerKey()
        , this.consumerSecret()
        , '1.0', null, 'HMAC-SHA1');
  })
  .verifyAttributes(function (req,res) {
    var p = this.Promise()
        oauth = this.oauth;
    this.relyingParty.verifyAssertion(req, function (err, userAttributes) {
      if(err) return p.fail(err);
      oauth.getOAuthAccessToken(userAttributes['request_token'], undefined, function (err, oauthAccessToken, oauthAccessTokenSecret) {
        if (err) return p.fail(err);
        userAttributes['access_token'] = oauthAccessToken;
        userAttributes['access_token_secret'] = oauthAccessTokenSecret;
        p.fulfill(userAttributes)
      });
    });
    return p;
  })
  .sendToAuthenticationUri(function (req, res) {

    // Automatic hostname detection + assignment
    if (!this._myHostname || this._alwaysDetectHostname) {
      this.myHostname(extractHostname(req));
    }
    
    var self = this;
    
    this.relyingParty.authenticate('http://me.yahoo.com', false, function (err,authenticationUrl){
      if(err) return p.fail(err);
      self.redirect(res, authenticationUrl);
    });
  }) 
  .entryPath('/auth/yahoohybrid')
  .callbackPath('/auth/yahoohybrid/callback');
