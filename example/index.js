var Hapi = require('hapi');
var port = process.env.PORT || 8080;
var server = new Hapi.Server(port, '0.0.0.0');

server.pack.register([
  {
    plugin: require('../'),
    options: {
      redirects: {
        '/test': '/it/works',
        '/something/else': '/it/works',
        '/': '/it/works?test=1'
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
        reply('redirects totally working')
      }
    }
  ]);

  server.start(function() {
    console.log('Hapi server started @', server.info.uri);
  });
});