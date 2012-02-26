var tobi = require('tobi')
  , expect = require('expect.js')
  , browser = tobi.createBrowser(3000, 'local.host')
  , creds = require('./creds.js');

require('./util/expect.js');

// Test a successful login
describe('a successful login', function () {
  it ('should succeed', function (done) {
    this.timeout(10000);
    browser.userAgent = 'Mozilla/5.0 (X11; Linux i686) AppleWebKit/534.30 (KHTML, like Gecko) Chrome/12.0.742.100 Safari/534.30';
    browser.get('/auth/facebook', function (res, $) {
      var form = $('#login_form');
      form
        .fill({ 
            email: creds.facebook.login
          , pass: creds.facebook.password

            // Need to do this; otherwise, parameters are corrupted, and Facebook responds with an error
            // Ideally, $.fn.serializeArray() would do this, but alas...
          , next: form.find('input[name="next"]').attr('value').replace(/&amp;/g, '&') })
        .submit(function (res, $) {
          var form = $('#uiserver_form');
          if (form.length) {
            // If we are at the "Request for Permission" page on Facebook
            return form.submit( function (res, $) {
              expect($('h2')).to.have.text('Authenticated');
              expect($('h2')).not.to.have.text('Not Authenticated');
              done();
            });

          }

          // Else we are back at local.host
          expect($('h2')).to.have.text('Authenticated');
          expect($('h2')).to.not.have.text('Not Authenticated');
          done();

        });
    });
  });
});
