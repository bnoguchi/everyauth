var everyModule = require('./everymodule')
  , oid = require('openid')
  , OAuth = require('oauth').OAuth
  , url = require('url');

var openid = module.exports =
everyModule.submodule('openid')
  .configurable({
     SimpleRegistration: 'e.g., {"nickname" : true}'
    , AttributeExchange: 'eg {"http://axschema.org/contact/email": "required"}'
    , myHostname: 'e.g., http://localhost:3000 . Notice no trailing slash'
    , redirectPath : 'The path to redirect To' 
    , openidURLField : 'The post field to use for open id'
    })
  .definit( function () {
    this.relyingParty = new oid.RelyingParty(this.myHostname() + this.callbackPath(), null, false, false, [
		new oid.UserInterface(), 
		
		new oid.SimpleRegistration(this.SimpleRegistration()),
		new oid.AttributeExchange(this.AttributeExchange())
		]);
	})
	.get('entryPath',
	'the link a user follows, whereupon you redirect them to the 3rd party OAuth provider dialog - e.g., "/auth/openid"')
	.step('sendToAuthenticationUri')
	.description('sends the user to the providers openid authUrl')
	.accepts('req res')
	.promises(null)
	.get('callbackPath',
	'the callback path that the 3rd party Openid provider redirects to after an OAuth authorization result - e.g., "/auth/openid/callback"')
    .step('verifyAttributes')
      .description('verifies the return attributes')
      .accepts('req res')
      .promises('userAttributes')
    .step('getSession')
      .accepts('req')
      .promises('session')
    .step('findOrCreateUser')
      .accepts('session userAttributes')
      .promises('user')
    .step('addToSession')
      .accepts('session user')
      .promises(null)
    .step('sendResponse')
      .accepts('res')
      .promises(null)
  .sendToAuthenticationUri(function(req,res) {
    this.relyingParty.authenticate(req.query[this.openidURLField()], false, function(authenticationUrl){
      if(authenticationUrl) {
        res.writeHead(302, { Location: authenticationUrl });
        res.end();
      }
    });
  })
  .getSession( function(req) {
    return req.session;
  })
  .verifyAttributes(function(req,res) {
    var p = this.Promise();
    this.relyingParty.verifyAssertion(req, function (userAttributes) {
	  if(!userAttributes.authenticated) return p.fail([userAttributes.error]);
		
      p.fulfill(userAttributes)
    });
    return p;
  })
  .addToSession( function (sess, user) {
    var _auth = sess.auth || (sess.auth = {})
      , mod = _auth[this.name] || (_auth[this.name] = {});
    _auth.loggedIn = true;
    _auth.userId = user.claimedIdentifier;
    mod.user = user;
  })
  .sendResponse( function (res) {
    var redirectTo = this.redirectPath();
    if (!redirectTo)
      throw new Error('You must configure a redirectPath');
    res.writeHead(303, {'Location': redirectTo});
    res.end();
  })
  .redirectPath('/')
  .entryPath('/auth/openid')
  .callbackPath('/auth/openid/callback')
  .SimpleRegistration({
						"nickname" : true, 
						"email" : true, 
						"fullname" : true,
						"dob" : true, 
						"gender" : true, 
						"postcode" : true,
						"country" : true, 
						"language" : true, 
						"timezone" : true
					  })
	.AttributeExchange({
						"http://axschema.org/contact/email": "required",
						"http://axschema.org/namePerson/friendly": "required",
						"http://axschema.org/namePerson": "required",
						"http://axschema.org/namePerson/first": "required",
						"http://axschema.org/contact/country/home":"required",
						"http://axschema.org/media/image/default":"required",
						"http://axschema.org/x/media/signature":"required"
					  })
	.openidURLField('openid_identifier')
	;

