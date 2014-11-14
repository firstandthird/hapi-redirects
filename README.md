hapi-redirects
==============

Hapi plugin for redirects


## Installation

`npm install --save hapi-redirects`

## Usage

```js
server.pack.register([
  { plugin: require('hapi-redirects'), options: {
    redirects: {
      "/shortlink": "/a/much/longer/path?search=longer",
      "/cats/cute": "/search?animal=cat&type=cute"
    }
  }
  }}
], function(err) {
});
```