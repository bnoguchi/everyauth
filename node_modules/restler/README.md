Restler 0.2.0
===========

(C) Dan Webb (dan@danwebb.net/@danwrong) 2011, Licensed under the MIT-LICENSE

An HTTP client library for node.js (0.3 and up).  Hides most of the complexity of creating and using http.Client. Very early days yet.


Features
--------

* Easy interface for common operations via http.request
* Automatic serialization of post data
* Automatic serialization of query string data
* Automatic deserialization of XML, JSON and YAML responses to JavaScript objects (if you have js-yaml and/or xml2js in the require path)
* Provide your own deserialization functions for other datatypes
* Automatic following of redirects
* Send files with multipart requests
* Transparently handle SSL (just specify https in the URL)
* Deals with basic auth for you, just provide username and password options
* Simple service wrapper that allows you to easily put together REST API libraries
    
    
API
---

### request(url, options)

Basic method to make a request of any type.  The function returns a RestRequest object
that emits events:

* _complete_ emitted when the request has finished whether it was successful or not.  Gets passed the response data and the response as arguments.
* _success_ emitted when the request was successful.  Gets passed the response data and the response as arguments.
* _error_ emitted when the request was unsuccessful.  Gets passed the response data and the response as arguments.
* _2XX, 3XX, 4XX, 5XX etc_ emitted for all requests with response codes in the range.  Eg. 2XX emitted for 200, 201, 203
* _actual response code_ there is an event emitted for every single response code.  eg.  404, 201, etc.

### get(url, options)

Create a GET request. 

### post(url, options)

Create a POST request.

### put(url, options)

Create a PUT request.

### del(url, options)

Create a DELETE request.

### response parsers

You can give any of these to the parsers option to specify how the response data is deserialized.

#### parsers.auto

Checks the content-type and then uses parsers.xml, parsers.json or parsers.yaml.  
If the content type isn't recognised it just returns the data untouched.

#### parsers.json, parsers.xml, parsers.yaml

All of these attempt to turn the response into a JavaScript object. In order to use the YAML and XML parsers you must have yaml and/or xml2js installed.

### options hash

* _method_ Request method, can be get, post, put, del
* _query_ Query string variables as a javascript object, will override the querystring in the URL
* _data_ The data to be added to the body of the request.  Can be a string or any object
* _parser_ A function that will be called on the returned data.  try parsers.auto, parsers.json etc
* _encoding_ The encoding of the request body.  defaults to utf8
* _headers_ a hash of HTTP headers to be sent
* _username_ Basic auth username
* _password_ Basic auth password
* _multipart_ If set the data passed will be formated as multipart/form-encoded.  See multipart example below.
* _client_ A http.Client instance if you want to reuse or implement some kind of connection pooling.
* _followRedirects_ Does what it says on the tin.


Example usage
-------------

    var sys = require('sys'),
        rest = require('./restler');

    rest.get('http://google.com').on('complete', function(data) {
      sys.puts(data);
    });

    rest.get('http://twaud.io/api/v1/users/danwrong.json').on('complete', function(data) {
      sys.puts(data[0].message); // auto convert to object
    });
    
    rest.get('http://twaud.io/api/v1/users/danwrong.xml').on('complete', function(data) {
      sys.puts(data[0].sounds[0].sound[0].message); // auto convert to object
    });
    
    rest.post('http://user:pass@service.com/action', {
      data: { id: 334 },
    }).on('complete', function(data, response) {
      if (response.statusCode == 201) {
        // you can get at the raw response like this...
      }
    });
    
    // multipart request sending a file and using https
    rest.post('https://twaud.io/api/v1/upload.json', {
      multipart: true,
      username: 'danwrong',
      password: 'wouldntyouliketoknow',
      data: {
        'sound[message]': 'hello from restler!',
        'sound[file]': rest.file('doug-e-fresh_the-show.mp3', 'audio/mpeg')
      }
    }).on('complete', function(data) {
      sys.puts(data.audio_url);
    });
    
    // create a service constructor for very easy API wrappers a la HTTParty...
    Twitter = rest.service(function(u, p) {
      this.defaults.username = u;
      this.defaults.password = p;
    }, {
      baseURL: 'http://twitter.com'
    }, {
      update: function(message) {
        return this.post('/statuses/update.json', { data: { status: message } });
      }
    });
    
    var client = new Twitter('danwrong', 'password');
    client.update('Tweeting using a Restler service thingy').on('complete', function(data) {
      sys.p(data);
    });

    
Running the tests
-----------------

    node test/restler.js 
    
TODO
----
* Deal with no utf-8 response bodies
* What do you need? Let me know or fork.