var Code = require('code');   // assertion library
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var Hapi = require('hapi');
var module = require("../index.js");

lab.experiment('hapi-redirect', function() {
  var server;

  lab.beforeEach(function(done) {
    server = new Hapi.Server();
    server.connection();
    server.route([
      {
        method: 'GET',
        path: '/it/works',
        handler: function(request, reply) {
          reply('redirects totally working');
        }
      },
      {
        method: 'GET',
        path: '/newtest',
        handler: function(request, reply) {
          console.log(request.params)
         reply('vhost redirects totally working ');
        }
      },
      {
        method: 'GET',
        path: '/newtest/{param*2}',
        handler: function(request, reply) {
          console.log(request.params)
          reply('redirects totally working and param passed was ' + request.params.param);
        }
      }
    ]);
    done();
  });

  lab.afterEach(function(done){
    server.stop(done);
  });

  lab.test(' /test -> /it/works   /something/else -> /it/works', function(done){
    server.register({
      register : module,
      options : {
        redirects: {
          '/test': '/it/works',
          '/something/else': '/it/works'
        },
      }
    },
    function(err){
      server.start(function(){
        server.inject({
          method: 'get',
          url: '/test'
        }, function(result){
          Code.expect(result.statusCode).to.equal(302);
          Code.expect(result.headers.location).to.equal('/it/works');
          server.inject({
            method: 'get',
            url: '/something/else'
          }, function(result){
            Code.expect(result.statusCode).to.equal(302);
            Code.expect(result.headers.location).to.equal('/it/works');
            done();
          });
        });
      });
    });
  });

  lab.test(' / -> /it/works?test=1', function(done){
    server.register({
      register : module,
      options : {
        redirects: {
          '/': '/it/works?test=1',
        },
      }
    },
    function(err){
      server.start(function(){
        server.inject({
          method: 'get',
          url: '/'
        }, function(result){
          Code.expect(result.statusCode).to.equal(302);
          Code.expect(result.headers.location).to.equal('/it/works?test=1');
          done();
        });
      });
    });
  });

  lab.test(' /test/{params*2} -> /newtest/{param*2}', function(done){
    server.register({
      register : module,
      options : {
        redirects: {
          '/test/{param*2}': '/newtest/{param*2}'
        },
      }
    },
    function(err){
      server.start(function(){
        server.inject({
          method: 'get',
          url: '/test/param1/param2',
          headers: {
            'Host': 'en.example.com'
          },
        }, function(result){
          Code.expect(result.statusCode).to.equal(302);
          Code.expect(result.headers.location).to.equal('/newtest/param1/param2');
          done();
        });
      });
    });
  });

  lab.test(' blahblah.localhost.com/test -> /newtest', function(done){
    server.register({
      register : module,
      options : {
        log : true,
        log404: true,
        redirects: {
          '/test': '/it/works'
        },
        vhosts: {
          'blahblah.com.localhost': {
            '/test': '/newtest',
            '/post/(.*)/': '/newtest',
            '/*' : '/newtest',
          }
        }
      }
    },
    function(err){
      server.start(function(){
        server.inject({
          method: 'get',
          url: '/test',
          headers: {
             'Host': 'blahblah.com.localhost'
          }
        }, function(result){
          Code.expect(result.statusCode).to.equal(302);
          Code.expect(result.headers.location).to.equal('/newtest');
          done();
        });
      });
    });
  });

  lab.test('expose plugin', function(done){
    server.register({
      register : module,
      options : {
        log : true,
        log404: true
      }
    }, function(err){
      server.plugins['hapi-redirects'].register({
        redirects: {
          '/test': '/it/works'
        },
        vhosts: {
          'blahblah.com.localhost': {
            '/test': '/newtest',
          }
        }
      }, function(){
        server.start(function(){
          server.inject({
            method: 'get',
            url: '/test',
            headers: {
               'Host': 'blahblah.com.localhost'
            }
          }, function(result){
            Code.expect(result.statusCode).to.equal(302);
            Code.expect(result.headers.location).to.equal('/newtest');
            done();
          });
        });
      });
    });
  });

});
