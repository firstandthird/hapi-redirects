var Hapi = require('hapi');
var port = process.env.PORT || 8081;
var server = new Hapi.Server({
  debug: {
    log: ['hapi-redirects', 'error'],
    request: ['tail', 'error']
  }
});
server.connection({ port: port });

server.register([
  {
    register: require('../'),
    options: {
      log: true,
      log404: true,
      redirects: {
        '/test': '/it/works',
        '/something/else': '/it/works',
        '/': '/it/works?test=1',
        '/test/{param*2}': '/newtest/{param*2}'
      },
      vhosts: {
        'blahblah.com.localhost': {
          '/test': '/newtest',
          '/post/(.*)/': '/newtest',
          '/*' : '/newtest',
        }
      }
    }
  }
], function(err) {
  if (err) {
    throw err;
  }

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

  server.start(function() {
    console.log('Hapi server started @', server.info.uri);
  });
});
