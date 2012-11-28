// everyauth with connect example
// conf.js file set 'appId', 'appSecret'
//
// connect@2.7.0
// everyauth@0.3.1

var everyauth   = require('everyauth')
    ,http       = require('http')
    ,connect    = require('connect');

var conf = require('./conf');

// Step 3 implement
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

var usersByFbId = {}

everyauth.everymodule
    .findUserById( function (id, callback) {
        callback(null, usersById[id]);
    });

everyauth.everymodule.handleLogout( function (req, res) {
    // Put you extra logic here

    req.logout(); // The logout method is added for you by everyauth, too

    // And/or put your extra logic here

    this.redirect(res, this.logoutRedirectPath());
});

everyauth.facebook
    .appId(conf.fb.appId)
    .appSecret(conf.fb.appSecret)
    .handleAuthCallbackError( function (req, res) {
        console.log("callback error");
    })
    .findOrCreateUser( function (session, accessToken, accessTokenExtra, fbUserMetadata) {
        console.log('session:'+session);
        console.log('token:'+accessToken);
        console.log('extra:'+accessTokenExtra);
        console.log('meta:'+fbUserMetadata);
        return usersByFbId[fbUserMetadata.id] ||
            (usersByFbId[fbUserMetadata.id] = addUser('facebook', fbUserMetadata));
    })
    .redirectPath('/');

var app = connect(
    connect.bodyParser()
    , connect.cookieParser()
    , connect.session({secret: 'mr ripley'})
    , everyauth.middleware()
);

app.use(function (req, res) {
    res.end(JSON.stringify(usersByFbId));
})

http.createServer(app).listen(3000)
console.log("server listen on 3000")