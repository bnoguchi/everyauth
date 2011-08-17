var express = require('express')
  , everyauth = require('../index')
  , conf = require('./conf');

everyauth.debug = true;

var usersById = {};
var nextUserId = 0;

function addUser (source, sourceUser) {
  var user;
  if (arguments.length === 1) { // password-based
    user = sourceUser = source;
    user.id = ++nextUserId;
    return usersById[nextUserId] = user;
  } else { // non-password-based
    user = usersById[++nextUserId] = {id: nextUserId};
    user[source] = sourceUser;
  }
  return user;
}

var usersByVimeoId = {};
var usersByJustintvId = {};
var usersByTumblrName = {};
var usersByDropboxId = {};
var usersByFbId = {};
var usersByTwitId = {};
var usersByGhId = {};
var usersByInstagramId = {};
var usersByFoursquareId = {};
var usersByGowallaId = {};
var usersByLinkedinId = {};
var usersByGoogleId = {};
var usersByYahooId = {};
var usersByGoogleHybridId = {};
var usersByReadabilityId = {};
var usersByBoxId = {};
var usersByOpenId = {};
var usersByLogin = {
  'brian@example.com': addUser({ login: 'brian@example.com', password: 'password'})
};

everyauth.everymodule
  .findUserById( function (id, callback) {
    callback(null, usersById[id]);
  });

everyauth
  .openid
    .myHostname('http://local.host:3000')
    .findOrCreateUser( function (session, userMetadata) {
      return usersByOpenId[userMetadata.claimedIdentifier] ||
        (usersByOpenId[userMetadata.claimedIdentifier] = addUser('openid', userMetadata));
    })
    .redirectPath('/');


everyauth
  .facebook
    .appId(conf.fb.appId)
    .appSecret(conf.fb.appSecret)
    .findOrCreateUser( function (session, accessToken, accessTokenExtra, fbUserMetadata) {
      return usersByFbId[fbUserMetadata.id] ||
        (usersByFbId[fbUserMetadata.id] = addUser('facebook', fbUserMetadata));
    })
    .redirectPath('/');

everyauth
  .twitter
    .myHostname('http://local.host:3000')
    .consumerKey(conf.twit.consumerKey)
    .consumerSecret(conf.twit.consumerSecret)
    .findOrCreateUser( function (sess, accessToken, accessSecret, twitUser) {
      return usersByTwitId[twitUser.id] || (usersByTwitId[twitUser.id] = addUser('twitter', twitUser));
    })
    .redirectPath('/');

everyauth
  .password
    .loginWith('email')
    .getLoginPath('/login')
    .postLoginPath('/login')
    .loginView('login.jade')
//    .loginLocals({
//      title: 'Login'
//    })
//    .loginLocals(function (req, res) {
//      return {
//        title: 'Login'
//      }
//    })
    .loginLocals( function (req, res, done) {
      setTimeout( function () {
        done(null, {
          title: 'Async login'
        });
      }, 200);
    })
    .authenticate( function (login, password) {
      var errors = [];
      if (!login) errors.push('Missing login');
      if (!password) errors.push('Missing password');
      if (errors.length) return errors;
      var user = usersByLogin[login];
      if (!user) return ['Login failed'];
      if (user.password !== password) return ['Login failed'];
      return user;
    })

    .getRegisterPath('/register')
    .postRegisterPath('/register')
    .registerView('register.jade')
//    .registerLocals({
//      title: 'Register'
//    })
//    .registerLocals(function (req, res) {
//      return {
//        title: 'Sync Register'
//      }
//    })
    .registerLocals( function (req, res, done) {
      setTimeout( function () {
        done(null, {
          title: 'Async Register'
        });
      }, 200);
    })
    .validateRegistration( function (newUserAttrs, errors) {
      var login = newUserAttrs.login;
      if (usersByLogin[login]) errors.push('Login already taken');
      return errors;
    })
    .registerUser( function (newUserAttrs) {
      var login = newUserAttrs[this.loginKey()];
      return usersByLogin[login] = addUser(newUserAttrs);
    })

    .loginSuccessRedirect('/')
    .registerSuccessRedirect('/');

everyauth.github
  .myHostname('http://local.host:3000')
  .appId(conf.github.appId)
  .appSecret(conf.github.appSecret)
  .findOrCreateUser( function (sess, accessToken, accessTokenExtra, ghUser) {
      return usersByGhId[ghUser.id] || (usersByGhId[ghUser.id] = addUser('github', ghUser));
  })
  .redirectPath('/');

everyauth.instagram
  .myHostname('http://local.host:3000')
  .appId(conf.instagram.clientId)
  .appSecret(conf.instagram.clientSecret)
  .scope('basic')
  .findOrCreateUser( function (sess, accessToken, accessTokenExtra, hipster) {
      return usersByInstagramId[hipster.id] || (usersByInstagramId[hipster.id] = addUser('instagram', hipster));
  })
  .redirectPath('/');

everyauth.foursquare
  .myHostname('http://local.host:3000')
  .appId(conf.foursquare.clientId)
  .appSecret(conf.foursquare.clientSecret)
  .findOrCreateUser( function (sess, accessTok, accessTokExtra, addict) {
      return usersByFoursquareId[addict.id] || (usersByFoursquareId[addict.id] = addUser('foursquare', addict));
  })
  .redirectPath('/');

everyauth.gowalla
  .myHostname('http://local.host:3000')
  .appId(conf.gowalla.apiKey)
  .appSecret(conf.gowalla.apiSecret)
  .moduleErrback( function(err) {
    console.log("moduleErrback for Gowalla", err);
  })
  .findOrCreateUser( function (sess, accessToken, accessTokenExtra, loser) {
    return usersByGowallaId[loser.url] || (usersByGowallaId[loser.url] = addUser('gowalla', loser));
  })
  .redirectPath('/');

everyauth.linkedin
  .myHostname('http://local.host:3000')
  .consumerKey(conf.linkedin.apiKey)
  .consumerSecret(conf.linkedin.apiSecret)
  .findOrCreateUser( function (sess, accessToken, accessSecret, linkedinUser) {
    return usersByLinkedinId[linkedinUser.id] || (usersByLinkedinId[linkedinUser.id] = addUser('linkedin', linkedinUser));
  })
  .redirectPath('/');

everyauth.google
  .myHostname('http://localhost:3000')
  .appId(conf.google.clientId)
  .appSecret(conf.google.clientSecret)
  .scope('https://www.google.com/m8/feeds/')
  .findOrCreateUser( function (sess, accessToken, extra, googleUser) {
    googleUser.refreshToken = extra.refresh_token;
    googleUser.expiresIn = extra.expires_in;
    return usersByGoogleId[googleUser.id] || (usersByGoogleId[googleUser.id] = addUser('google', googleUser));
  })
  .redirectPath('/');

everyauth.yahoo
  .myHostname('http://local.host:3000')
  .consumerKey(conf.yahoo.consumerKey)
  .consumerSecret(conf.yahoo.consumerSecret)
  .findOrCreateUser( function (sess, accessToken, accessSecret, yahooUser) {
    return usersByYahooId[yahooUser.id] || (usersByYahooId[yahooUser.id] = addUser('yahoo', yahooUser));
  })
  .redirectPath('/');

everyauth.googlehybrid
  .myHostname('http://local.host:3000')
  .consumerKey(conf.google.clientId)
  .consumerSecret(conf.google.clientSecret)
  .scope(['http://docs.google.com/feeds/','http://spreadsheets.google.com/feeds/'])
  .findOrCreateUser( function(session, userAttributes) {
    return usersByGoogleHybridId[userAttributes.claimedIdentifier] || (usersByGoogleHybridId[userAttributes.claimedIdentifier] = addUser('googlehybrid', userAttributes));
  })
  .redirectPath('/')
    
everyauth.readability
  .myHostname('http://local.host:3000')
  .consumerKey(conf.readability.consumerKey)
  .consumerSecret(conf.readability.consumerSecret)
  .findOrCreateUser( function (sess, accessToken, accessSecret, reader) {
      return usersByReadabilityId[reader.username] || (usersByReadabilityId[reader.username] = addUser('readability', reader));
  })
  .redirectPath('/');

everyauth
  .dropbox
    .myHostname('http://local.host:3000')
    .consumerKey(conf.dropbox.consumerKey)
    .consumerSecret(conf.dropbox.consumerSecret)
    .findOrCreateUser( function (sess, accessToken, accessSecret, dropboxUserMetadata) {
      return usersByDropboxId[dropboxUserMetadata.uid] ||
        (usersByDropboxId[dropboxUserMetadata.uid] = addUser('dropbox', dropboxUserMetadata));
    })
    .redirectPath('/')

everyauth.vimeo
	.consumerKey(conf.vimeo.consumerKey)
	.consumerSecret(conf.vimeo.consumerSecret)
	.findOrCreateUser( function (sess, accessToken, accessSecret, vimeoUser) {
		return usersByVimeoId[vimeoUser.id] ||
			(usersByVimeoId[vimeoUser.id] = vimeoUser);
	})
	.redirectPath('/')

everyauth.justintv
  .consumerKey(conf.justintv.consumerKey)
  .consumerSecret(conf.justintv.consumerSecret)
  .findOrCreateUser( function (sess, accessToken, accessSecret, justintvUser) {
    return usersByJustintvId[justintvUser.id] ||
      (usersByJustintvId[justintvUser.id] = addUser('justintv', justintvUser));
  })
  .redirectPath('/')

everyauth.tumblr
  .consumerKey(conf.tumblr.consumerKey)
  .consumerSecret(conf.tumblr.consumerSecret)
  .findOrCreateUser( function (sess, accessToken, accessSecret, tumblrUser) {
    return usersByTumblrName[tumblrUser.name] ||
      (usersByTumblrName[tumblrUser.name] = addUser('tumblr', tumblrUser));
  })
  .redirectPath('/');
    
everyauth.box
  .apiKey(conf.box.apiKey)
  .findOrCreateUser( function (sess, authToken, boxUser) {
    return usersByBoxId[boxUser.user_id] ||
      (usersByDropboxId[boxUser.user_id] = addUser('box', boxUser));
  })
  .redirectPath('/');

var app = express.createServer(
    express.bodyParser()
  , express.static(__dirname + "/public")
  , express.cookieParser()
  , express.session({ secret: 'htuayreve'})
  , everyauth.middleware()
);

app.configure( function () {
  app.set('view engine', 'jade');
});

app.get('/', function (req, res) {
  res.render('home');
});

everyauth.helpExpress(app);

app.listen(3000);

console.log('Go to http://local.host:3000');
