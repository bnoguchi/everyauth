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
  .verifyAttributes(function(req,res) {
    var p = this.Promise()
        oa = this.oa;
    this.relyingParty.verifyAssertion(req, function (userAttributes) {
      if (userAttributes['authenticated']) {
        oa.getOAuthAccessToken(userAttributes['request_token'], undefined, function(error, oauth_access_token, oauth_access_token_secret) {
          userAttributes['access_token'] = oauth_access_token;
          userAttributes['access_token_secret'] = oauth_access_token_secret;
          p.fulfill(userAttributes)
        });
      } else {
        p.fail(userAttributes['error'])
      }
    });
    return p;
  })
  .sendToAuthenticationUri(function(req,res) {

    // Automatic hostname detection + assignment
    if (!this._myHostname || this._alwaysDetectHostname) {
      this.myHostname(extractHostname(req));
    }

    this.relyingParty.authenticate('http://www.google.com/accounts/o8/id', false, function(authenticationUrl){
      if(authenticationUrl) {
        res.writeHead(302, { Location: authenticationUrl });
        res.end();
      }
    });
  }) 
  .entryPath('/auth/googlehybrid')
  .callbackPath('/auth/googlehybrid/callback');
