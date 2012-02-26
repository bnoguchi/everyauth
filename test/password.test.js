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
            res.should.have.status(200);
            $('h2').should.have.text('Authenticated');
            $('h2').should.not.have.text('Not Authenticated');
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
              res.should.have.status(200);
              $('#errors li:first').should.have.text('Missing email');
              $('#errors li:eq(1)').should.have.text('Missing password');
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
              res.should.have.status(200);
              $('#errors').should.have.text('Please correct your email.');
              done();
            });
        });
      });

      it('should fail with an invalid email, no password', function (done) {
        browser.get('/register', function (res, $) {
          $('form')
            .fill({ email: 'newuser', password: '' })
            .submit( function (res, $) {
              res.should.have.status(200);
              $('#errors li:first').should.have.text('Please correct your email.');
              $('#errors li:eq(1)').should.have.text('Missing password');
              done();
            });
        });
      });

      it('should fail with a valid email, no password', function (done) {
        browser.get('/register', function (res, $) {
          $('form')
            .fill({ email: 'abc@example.com', password: '' })
            .submit( function (res, $) {
              res.should.have.status(200);
              $('#errors').should.have.text('Missing password');
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
            res.should.have.status(200);
            $('h2').should.have.text('Authenticated');
            $('h2').should.not.have.text('Not Authenticated');
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
              res.should.have.status(200);
              $('#errors').should.have.text('Login failed');
              done();
            });
        });
      });

      it('should fail with an empty password', function (done) {
        browser.get('/login', function (res, $) {
          $('form')
            .fill({ email: 'brian@example.com', password: '' })
            .submit( function (res, $) {
              $('#errors').should.have.text('Missing password');
              done();
            });
        });
      });

      it('should fail with no email, no password', function (done) {
        browser.get('/login', function (res, $) {
          $('form')
            .fill({ email: '', password: '' })
            .submit( function (res, $) {
              $('#errors li:first').should.have.text('Missing login');
              $('#errors li:eq(1)').should.have.text('Missing password');
              done();
            });
          });
      });
    });
  });
});
