var passwordModule = require('./password');
var LdapAuth = require('ldapauth');

var ldap = module.exports =
passwordModule.submodule('ldap')
  .configurable({
      ldapUrl: 'ldap server url'
    , adminDn: 'ldap bind dn'
    , adminPassword: 'ldap bind password'
    , searchBase: 'ldap search base'
    , searchFilter: 'ldap search filter'
    , requireGroupDn: 'ldap (option) required group DN'
  })
  .authenticate( function (login, password, req, res) {
    var promise = this.Promise();
    var ldapauth = new LdapAuth({
      url: this._ldapUrl,
      adminDn: this._adminDn,
      adminPassword: this._adminPassword,
      searchBase: this._searchBase,
      searchFilter: this._searchFilter,
      requireGroupDn: this._requireGroupDn,
      cache: true
    });
    ldapauth.authenticate(login, password, function (err, result) {
      var user, errors;
      if (err) {
        // return promise.fail(err);
        if (typeof err == 'string') {
          return promise.fulfill(['LDAP Error: ' + err]);
        } else {
          return promise.fulfill(['LDAP Error: ' + err.message]);        
        }
      }
      if (result === false) {
        errors = ['Login failed.'];
        return promise.fulfill(errors);
      } else if (typeof result == 'object') {
        if (result.uid == login) {
          user = {};
          user['id'] = login;
          console.log("LDAP: positive authorization for user " + result.uid + "")
          return promise.fulfill(user);
        } else {
          return promise.fulfill(['LDAP Error: result does not match username', result])
        }
      } else {
        console.log('ldapauth returned an unknown result:');
        console.log(result);
        return promise.fulfill(['Unknown ldapauth response']);        
      }
    });
    return promise;
  })
  .addToSession( function (sess, user, errors) {
    var _auth = sess.auth || (sess.auth = {});
    if (user)
      _auth.ldap = {
        userId: user[this._userPkey]
      };
    _auth.loggedIn = !!user;
  })
  .getRegisterPath('/nonexistant/register')
  .postRegisterPath('/nonexistant/register')
  .registerUser( function (newUserAttributes) {});

;
