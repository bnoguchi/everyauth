var tobi = require('tobi')
  , expect = require('expect.js')
  , browser = tobi.createBrowser(3000, 'local.host')
  , creds = require('./creds.js');

require('./util/expect.js');

// Test a successful login
describe('Twitter', function () {
  it('should successfully login with the right username, password', function (done) {
    this.timeout(10000);
    browser.userAgent = 'Mozilla/5.0 (X11; Linux i686) AppleWebKit/534.30 (KHTML, like Gecko) Chrome/12.0.742.100 Safari/534.30';
    browser.get('/auth/twitter', function (res, $) {
      $('#oauth_form')
        .fill({
            'session[username_or_email]': creds.twitter.login
          , 'session[password]': creds.twitter.password })
        .submit(function (res, $) {
          expect($('.happy.notice h2')).to.have.text('Redirecting you back to the application. This may take a few moments.');
          $('.happy.notice a').click( function (res, $) {
            expect(res).to.have.status(200);
            expect($('h2')).to.have.text('Authenticated');
            expect($('h2')).to.not.have.text('Not Authenticated');
            done();
          });
        });
    });
  });
});
