hapi-redirects [![Build Status](https://travis-ci.org/firstandthird/hapi-redirects.svg?branch=master)](https://travis-ci.org/firstandthird/hapi-redirects)
==============

Hapi plugin for redirects


## Installation

`npm install --save hapi-redirects`

## Usage

```js
server.register([
  {
    plugin: require('hapi-redirects'), options: {
      log: true,
      log404: true,
      // can match any valid hapi route specifier including route params and redirect to the specified value:
      redirects: {
        "/shortlink": "/a/much/longer/path?search=longer",
        '/post/(.*)/': '/cats',
        '/*': '/newtest',
        '/cats302': {
          destination: '/cats',
          statusCode: 302 // can overload the type of HTTP redirect
        },
        "/cats/cute": "/search?animal=cat&type=cute"
      },
      vhosts: {
        'cats.com': {
          '/cats-also': '/cats',
        }
      },
      // can be passed a function that dynamically generates new route
      // redirections every time an HTTP request is handled:
      getRedirects(pluginOptions, callback) {
        // the first parameter contains the plugin options:
        if (pluginOptions.log) {
          server.log(['redirect', 'cats'], 'cats');
        }
        // callback takes any error as the first param and a list of route redirections as the second:
        return callback(null, [
          {
            // this will HTTP 302 redirect every incoming request to '/dynamic-cats' to a different destination:
            '/dynamic-cats': {
              destination: '/cats/' + Math.random(),  
              statusCode: 302
            },
          }
        ]);
      }
    }
  }}
], function(err) {
});
```
