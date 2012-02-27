var tobi = require('tobi')
  , expect = require('expect.js')
  , browser = tobi.createBrowser(3000, 'local.host');

require('./util/expect.js');

describe('password', function () {
  describe('registration', function () {
    it('should succeed if provided with a username and password', function (done) {
      browser.get('/register', function (res, $) {
        $('form')
          .fill({ email: 'newuser@example.com', password: 'pass' })
          .submit( function (res, $) {
            expect(res).to.have.status(200);
            expect($('h2')).to.have.text('Authenticated');
            expect($('h2')).to.not.have.text('Not Authenticated');
            done();
          });
      });
    });

    describe('failing', function () {
      it('should fail if no email, no password', function (done) {
        browser.get('/register', function (res, $) {
          $('form')
            .fill({ email: '', password: '' })
            .submit( function (res, $) {
              expect(res).to.have.status(200);
              expect($('#errors li:first')).to.have.text('Missing email');
              expect($('#errors li:eq(1)')).to.have.text('Missing password');
              done();
            });
        });

        // TODO Add case of person trying to take an existing login
      });

      it('should fail with an invalid email, non-empty password', function (done) {
        browser.get('/register', function (res, $) {
          $('form')
            .fill({ email: 'newuser', password: 'pass' })
            .submit( function (res, $) {
              expect(res).to.have.status(200);
              expect($('#errors')).to.have.text('Please correct your email.');
              done();
            });
        });
      });

      it('should fail with an invalid email, no password', function (done) {
        browser.get('/register', function (res, $) {
          $('form')
            .fill({ email: 'newuser', password: '' })
            .submit( function (res, $) {
              expect(res).to.have.status(200);
              expect($('#errors li:first')).to.have.text('Please correct your email.');
              expect($('#errors li:eq(1)')).to.have.text('Missing password');
              done();
            });
        });
      });

      it('should fail with a valid email, no password', function (done) {
        browser.get('/register', function (res, $) {
          $('form')
            .fill({ email: 'abc@example.com', password: '' })
            .submit( function (res, $) {
              expect(res).to.have.status(200);
              expect($('#errors')).to.have.text('Missing password');
              done();
            });
        });
      });
    });
  });

  describe('login', function () {
    it('should succeed with the right email + password', function (done) {
      browser.get('/login', function (res, $) {
        $('form')
          .fill({ email: 'brian@example.com', password: 'password' })
          .submit( function (res, $) {
            expect(res).to.have.status(200);
            expect($('h2')).to.have.text('Authenticated');
            expect($('h2')).to.not.have.text('Not Authenticated');
            done();
          });
      });
    });

    describe('failing', function () {
      it('should fail with the wrong password', function (done) {
        browser.get('/login', function (res, $) {
          $('form')
            .fill({ email: 'brian@example.com', password: 'wrongpassword' })
            .submit( function (res, $) {
              expect(res).to.have.status(200);
              expect($('#errors')).to.have.text('Login failed');
              done();
            });
        });
      });

      it('should fail with an empty password', function (done) {
        browser.get('/login', function (res, $) {
          $('form')
            .fill({ email: 'brian@example.com', password: '' })
            .submit( function (res, $) {
              expect($('#errors')).to.have.text('Missing password');
              done();
            });
        });
      });

      it('should fail with no email, no password', function (done) {
        browser.get('/login', function (res, $) {
          $('form')
            .fill({ email: '', password: '' })
            .submit( function (res, $) {
              expect($('#errors li:first')).to.have.text('Missing login');
              expect($('#errors li:eq(1)')).to.have.text('Missing password');
              done();
            });
          });
      });
    });
  });
});
