const Hapi = require('hapi');
const port = process.env.PORT || 8081;
const server = new Hapi.Server({
  debug: {
    log: ['hapi-redirects', 'error'],
    request: ['tail', 'error']
  }
});
server.connection({ port });

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
        '/test/{param*2}': '/newtest/{param*2}',
        '/test302': {
          destination: '/it/works',
          statusCode: 302
        }
      },
      vhosts: {
        'blahblah.com.localhost': {
          '/test': '/newtest',
          '/post/(.*)/': '/newtest',
          '/*': '/newtest',
        }
      }
    }
  }
], (err) => {
  if (err) {
    throw err;
  }

  server.route([
    {
      method: 'GET',
      path: '/it/works',
      handler: (request, reply) => {
        reply('redirects totally working');
      }
    },
    {
      method: 'GET',
      path: '/newtest',
      handler: (request, reply) => {
        console.log(request.params);
        reply('vhost redirects totally working ');
      }
    },
    {
      method: 'GET',
      path: '/newtest/{param*2}',
      handler: (request, reply) => {
        console.log(request.params);
        reply(`redirects totally working and param passed was ${request.params.param}`);
      }
    }
  ]);
  server.start(() => {
    console.log(`Hapi server started @ ${server.info.uri}`);
  });
});
