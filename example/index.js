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
      redirects: {
        '/test': '/it/works',
        '/something/else': '/it/works',
        '/': '/it/works?test=1',
        '/test/{param}': '/it/works'
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
    }
  ]);

  server.start(function() {
    console.log('Hapi server started @', server.info.uri);
  });
});
