var openidModule = require('./openid')
  , OAuth = require('oauth').OAuth
  , oid = require('openid')
  , extractHostname = require('../utils').extractHostname;

var googlehybrid = module.exports =
openidModule.submodule('googlehybrid')
  .configurable({
       scope: 'array of desired google api scopes'
     , consumerKey: 'consumerKey'
     , consumerSecret: 'consumerSecret'
  })
  .definit( function () {
    this.relyingParty = new oid.RelyingParty(this.myHostname() + this.callbackPath(), null, false, false, [
      new oid.AttributeExchange({
        "http://axschema.org/contact/email": "required",
        "http://axschema.org/namePerson/first": "required",
        "http://axschema.org/namePerson/last": "required"
      }),
      new oid.OAuthHybrid({
        'consumerKey' : this.consumerKey(),
        'scope' : this.scope().join('+')
      })
    ]);
    
    this.oa = new OAuth(
      "https://www.google.com/accounts/OAuthGetRequestToken",
      "https://www.google.com/accounts/OAuthGetAccessToken",
      this.consumerKey(),
      this.consumerSecret(),
      "1.0",  null, "HMAC-SHA1");
  })
  .verifyAttributes(function (req,res) {
    var p = this.Promise()
        oa = this.oa;
    this.relyingParty.verifyAssertion(req, function (err, userAttributes) {
      if(err) return p.fail(err);
      console.log(userAttributes);
      oa.getOAuthAccessToken(userAttributes['request_token'], undefined, function (err, oauthAccessToken, oauthAccessTokenSecret) {
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

    this.relyingParty.authenticate('http://www.google.com/accounts/o8/id', false, function (err,authenticationUrl){
     if(err) return p.fail(err);
      
      res.writeHead(302, { Location: authenticationUrl });
      res.end();
    });
  }) 
  .entryPath('/auth/googlehybrid')
  .callbackPath('/auth/googlehybrid/callback');
