hapi-redirects [![Build Status](https://travis-ci.org/firstandthird/hapi-redirects.svg?branch=master)](https://travis-ci.org/firstandthird/hapi-redirects)
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
