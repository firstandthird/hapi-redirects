'use strict';
const Code = require('code');   // assertion library
const Lab = require('lab');
const lab = exports.lab = Lab.script();
const Hapi = require('hapi');
const redirectModule = require('../index.js');

lab.experiment('hapi-redirect', () => {
  let server;

  lab.beforeEach(async() => {
    server = new Hapi.Server();
    server.route([
      {
        method: 'GET',
        path: '/it/works',
        handler: (request, h) => {
          return 'redirects totally working';
        }
      },
      {
        method: 'GET',
        path: '/newtest',
        handler: (request, h) => {
          return 'vhost redirects totally working ';
        }
      },
      {
        method: 'GET',
        path: '/newtest/{param*2}',
        handler: (request, h) => {
          return `redirects totally working and param passed was ${request.params.param}`;
        }
      }
    ]);

    await server.start();
  });

  lab.afterEach(async() => {
    await server.stop();
  });

  lab.test(' /test -> /it/works   /something/else -> /it/works', async() => {
    await server.register({
      plugin: redirectModule,
      options: {
        redirects: {
          '/test': '/it/works',
          '/something/else': '/it/works'
        },
      }
    });
    await server.start();
    const result = await server.inject({
      method: 'get',
      url: '/test'
    });
    Code.expect(result.statusCode).to.equal(301);
    Code.expect(result.headers.location).to.equal('/it/works');
    const testResult = await server.inject({
      method: 'get',
      url: '/something/else'
    });
    Code.expect(testResult.statusCode).to.equal(301);
    Code.expect(testResult.headers.location).to.equal('/it/works');
  });

  lab.test(' /test -> https://google.com', async() => {
    await server.register({
      plugin: redirectModule,
      options: {
        redirects: {
          '/test': 'https://google.com/'
        },
      }
    });
    await server.start();
    const result = await server.inject({
      method: 'get',
      url: '/test'
    });
    Code.expect(result.statusCode).to.equal(301);
    Code.expect(result.headers.location).to.equal('https://google.com/');
  });

  lab.test(' / -> /it/works?test=1', async() => {
    await server.register({
      plugin: redirectModule,
      options: {
        redirects: {
          '/': '/it/works?test=1',
        },
      }
    });
    await server.start();
    const result = await server.inject({
      method: 'get',
      url: '/'
    });
    Code.expect(result.statusCode).to.equal(301);
    Code.expect(result.headers.location).to.equal('/it/works?test=1');
  });

  lab.test(' /?moniker=hugo + /it/works?test=1 -> /it/works?test=1&moniker=hugo', async() => {
    await server.register({
      plugin: redirectModule,
      options: {
        redirects: {
          '/': '/it/works?test=1',
        },
      }
    });
    await server.start();
    const result = await server.inject({
      method: 'get',
      url: '/?moniker=hugo'
    });
    Code.expect(result.statusCode).to.equal(301);
    Code.expect(result.headers.location).to.equal('/it/works?moniker=hugo&test=1');
  });

  lab.test(' / -> /to/{params*}', async() => {
    await server.register({
      plugin: redirectModule,
      options: {
        appendQueryString: false,
        redirects: {
          '/{params*}': '/to/{params*}',
        },
      }
    });
    await server.start();
    const result = await server.inject({
      method: 'get',
      url: '/some/params/here'
    });
    Code.expect(result.statusCode).to.equal(301);
    Code.expect(result.headers.location).to.equal('/to/some/params/here');
  });

  lab.test(' /?query=1 -> /it/works?query=1', async() => {
    await server.register({
      plugin: redirectModule,
      options: {
        redirects: {
          '/': '/it/works',
        },
      }
    });
    await server.start();
    const result = await server.inject({
      method: 'get',
      url: '/?query=1'
    });
    Code.expect(result.statusCode).to.equal(301);
    Code.expect(result.headers.location).to.equal('/it/works?query=1');
  });

  lab.test(' /from/{param}/?query=1 -> /to/{param}?query=1', async() => {
    await server.register({
      plugin: redirectModule,
      options: {
        redirects: {
          '/from/{param*}': '/to/{param*}',
        },
      }
    });
    await server.start();
    const result = await server.inject({
      method: 'get',
      url: '/from/test?query=1'
    });
    Code.expect(result.statusCode).to.equal(301);
    Code.expect(result.headers.location).to.equal('/to/test?query=1');
  });

  lab.test(' /from/{param}/?query=1 -> /to/{param}?query=1', async() => {
    await server.register({
      plugin: redirectModule,
      options: {
        redirects: {
          '/from/{param*}': '/to/{param*}',
        },
      }
    });
    await server.start();
    const result = await server.inject({
      method: 'get',
      url: '/from/myParam?query=1'
    });
    Code.expect(result.statusCode).to.equal(301);
    Code.expect(result.headers.location).to.equal('/to/myParam?query=1');
  });

  lab.test(' /test/{params*2} -> /newtest/{param*2}', async() => {
    await server.register({
      plugin: redirectModule,
      options: {
        redirects: {
          '/test/{param*2}': '/newtest/{param*2}'
        },
      }
    });
    await server.start();
    const result = await server.inject({
      method: 'get',
      url: '/test/param1/param2',
      headers: {
        Host: 'en.example.com'
      },
    });
    Code.expect(result.statusCode).to.equal(301);
    Code.expect(result.headers.location).to.equal('/newtest/param1/param2');
  });

  lab.test(' blahblah.localhost.com/test -> /newtest', async() => {
    await server.register({
      plugin: redirectModule,
      options: {
        log: true,
        log404: true,
        redirects: {
          '/test': '/it/works'
        },
        vhosts: {
          'blahblah.com.localhost': {
            '/test': '/newtest',
            '/post/(.*)/': '/newtest',
            '/*': '/newtest',
          }
        }
      }
    });
    await server.start();
    const result = await server.inject({
      method: 'get',
      url: '/test',
      headers: {
        Host: 'blahblah.com.localhost'
      }
    });
    Code.expect(result.statusCode).to.equal(301);
    Code.expect(result.headers.location).to.equal('/newtest');
  });

  lab.test('expose plugin', async() => {
    await server.register({
      plugin: redirectModule,
      options: {
        log: true,
        log404: true
      }
    });
    server.plugins['hapi-redirects'].register({
      redirects: {
        '/test': '/it/works'
      },
      vhosts: {
        'blahblah.com.localhost': {
          '/test': '/newtest',
        }
      }
    });
    await server.start();
    const result = await server.inject({
      method: 'get',
      url: '/test',
      headers: {
        Host: 'blahblah.com.localhost'
      }
    });
    Code.expect(result.statusCode).to.equal(301);
    Code.expect(result.headers.location).to.equal('/newtest');
  });

  lab.test('set default status code', async() => {
    await server.register({
      plugin: redirectModule,
      options: {
        statusCode: 302,
        redirects: {
          '/': '/it/works',
        },
      }
    });
    await server.start();
    const result = await server.inject({
      method: 'get',
      url: '/'
    });
    Code.expect(result.statusCode).to.equal(302);
  });

  lab.test('set default status code with "temporary"', async() => {
    await server.register({
      plugin: redirectModule,
      options: {
        statusCode: 'temporary',
        redirects: {
          '/': '/it/works',
        },
      }
    });
    await server.start();
    const result = await server.inject({
      method: 'get',
      url: '/'
    });
    Code.expect(result.statusCode).to.equal(302);
  });

  lab.test('set default status code with "permanent"', async() => {
    await server.register({
      plugin: redirectModule,
      options: {
        statusCode: 'permanent',
        redirects: {
          '/': '/it/works',
        },
      }
    });
    await server.start();
    const result = await server.inject({
      method: 'get',
      url: '/'
    });
    Code.expect(result.statusCode).to.equal(301);
  });

  lab.test(' set status code for specific route (without params)', async() => {
    await server.register({
      plugin: redirectModule,
      options: {
        redirects: {
          '/test301': '/it/works',
          '/test302': {
            destination: '/it/works',
            statusCode: 302
          }
        },
      }
    });
    await server.start();
    const result = await server.inject({
      method: 'get',
      url: '/test302'
    });
    Code.expect(result.statusCode).to.equal(302);
    Code.expect(result.headers.location).to.equal('/it/works');
    const result2 = await server.inject({
      method: 'get',
      url: '/test301'
    });
    Code.expect(result2.statusCode).to.equal(301);
    Code.expect(result2.headers.location).to.equal('/it/works');
  });

  lab.test(' set status code for specific route (with params)', async() => {
    await server.register({
      plugin: redirectModule,
      options: {
        redirects: {
          '/test/{param*2}': {
            destination: '/newtest/{param*2}',
            statusCode: 302
          }
        },
      }
    });
    await server.start();
    const result = await server.inject({
      method: 'get',
      url: '/test/param1/param2',
      headers: {
        Host: 'en.example.com'
      },
    });
    Code.expect(result.statusCode).to.equal(302);
    Code.expect(result.headers.location).to.equal('/newtest/param1/param2');
  });

  lab.test(' set status code for specific route (with vhost) ', async() => {
    await server.register({
      plugin: redirectModule,
      options: {
        log: true,
        log404: true,
        vhosts: {
          'blahblah.com.localhost': {
            '/test': {
              destination: '/newtest',
              statusCode: 302
            },
            '/post/(.*)/': '/newtest',
            '/*': '/newtest',
          }
        }
      }
    });
    await server.start();
    const result = await server.inject({
      method: 'get',
      url: '/test',
      headers: {
        Host: 'blahblah.com.localhost'
      }
    });
    Code.expect(result.statusCode).to.equal(302);
    Code.expect(result.headers.location).to.equal('/newtest');
  });

  lab.test(' accepts a callback that adds additional dynamic routes', async() => {
    let count = 0;
    await server.register({
      plugin: redirectModule,
      options: {
        log: true,
        log404: true,
        redirects: {
          '/test301': '/it/works',
        },
        getRedirects: async (pluginOptions) => {
          // dynamic method takes callback from the plugin:
          Code.expect(pluginOptions.log).to.equal(true);
          count++;
          return {
            '/test': {
              destination: `/newtest${count}`,
              statusCode: 302
            }
          };
        }
      }
    });
    const result = await server.inject({
      method: 'get',
      url: '/test'
    });
    Code.expect(result.statusCode).to.equal(302);
    Code.expect(result.headers.location).to.equal('/newtest1');
    const result2 = await server.inject({
      method: 'get',
      url: '/test'
    });
    Code.expect(result2.statusCode).to.equal(302);
    Code.expect(result2.headers.location).to.equal('/newtest2');
    // static routes still work:
    const result3 = await server.inject({
      method: 'get',
      url: '/test301'
    });
    Code.expect(result3.statusCode).to.equal(301);
    Code.expect(result3.headers.location).to.equal('/it/works');
  });

  lab.test(' will respond with error if additional route function returns error', async() => {
    await server.register({
      plugin: redirectModule,
      options: {
        log: true,
        log404: true,
        redirects: {
          '/test': '/it/works',
        },
        getRedirects(pluginOptions, redirectDone) {
          throw new Error('an error');
        }
      }
    });
    const result = await server.inject({
      method: 'get',
      url: '/test'
    });
    Code.expect(result.statusCode).to.equal(404);
  });

  lab.test(' will throw an error if dynamic routes clash with existing routes', async() => {
    await server.register({
      plugin: redirectModule,
      options: {
        log: true,
        log404: true,
        redirects: {
          '/test': '/it/works',
        },
        getRedirects(pluginOptions) {
          // duplicate will result in a 500:
          return {
            '/test': '/newtest'
          };
        }
      }
    });
    const result = await server.inject({
      method: 'get',
      url: '/test'
    });
    Code.expect(result.statusCode).to.equal(500);
  });

  lab.test('emits event when redirect occurs', async() => {
    await server.register({
      plugin: redirectModule,
      options: {
        redirects: {
          '/test': '/it/works',
          '/something/else': '/it/works'
        },
      }
    });
    server.events.on('redirect', async (redirectInfo) => {
      Code.expect(redirectInfo).to.equal('/it/works');
    });
    await server.start();
    const result = await server.inject({
      method: 'get',
      url: '/test'
    });
    Code.expect(result.statusCode).to.equal(301);
    Code.expect(result.headers.location).to.equal('/it/works');
  });

  lab.test(' returns 404 if no route or redirect matches', async() => {
    await server.register({
      plugin: redirectModule,
      options: {
      }
    });
    await server.start();
    const result = await server.inject({
      method: 'get',
      url: '/test'
    });
    Code.expect(result.statusCode).to.equal(404);
  });
});
