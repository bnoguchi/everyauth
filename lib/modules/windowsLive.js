var oauthModule = require('./oauth2')
    , url = require('url');

var fb = module.exports =
    oauthModule.submodule('windowsLive')
        .configurable({
            scope: 'specify types of access: http://msdn.microsoft.com/en-us/library/hh243646(en-us).aspx',
            display: 'The display type to be used for the authorization page. Valid values are "popup", "touch", "page", or "none".',
            locale: 'Optional. A market string that determines how the consent UI is localized. If the value of this parameter is missing or is not valid, a market value is determined by using an internal algorithm.'
        })

        .apiHost('https://apis.live.net/v5.0')
        .oauthHost('https://oauth.live.com')

        .authPath('https://oauth.live.com/authorize')

        .entryPath('/auth/windowslive')
        .accessTokenHttpMethod('get')
        .accessTokenPath('/token')
        .callbackPath('/auth/windowslive/callback')

		.scope('wl.signin')
		.display('page')

        .authQueryParam('scope', function () {
            return this._scope && this.scope();
        })

        .authQueryParam('response_type', function () {
            return 'code';
        })

        .accessTokenParam('grant_type', function () {
            return 'authorization_code';
        })

        .authQueryParam('display', function () {
            return this._display && this.display();
        })

        .authCallbackDidErr( function (req) {
            var parsedUrl = url.parse(req.url, true);
            return parsedUrl.query && !!parsedUrl.query.error;
        })

        .handleAuthCallbackError( function (req, res) {
            var parsedUrl = url.parse(req.url, true)
                , errorDesc = parsedUrl.query.error_description;
            if (res.render) {
                res.render(__dirname + '/../views/auth-fail.jade', {
                    errorDescription: errorDesc
                });
            } else {
                // TODO Replace this with a nice fallback
                throw new Error("You must configure handleAuthCallbackError if you are not using express");
            }
        })

        .fetchOAuthUser( function (accessToken) {
            var p = this.Promise();
            this.oauth.get(this.apiHost() + '/me', accessToken, function (err, data) {
                if (err)
                    return p.fail(err);
                var oauthUser = JSON.parse(data);
                p.fulfill(oauthUser);
            })
            return p;
        })

        .convertErr( function (data) {
            if (typeof data == 'string')
                return new Error(JSON.parse(data.data).error.message);
            if (data)
                return new Error(data.error + ' - ' + data.error_description);
            else
                return new Error('unknown error');
        });
