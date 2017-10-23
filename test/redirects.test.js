'use strict';
const Code = require('code');   // assertion library
const Lab = require('lab');
const lab = exports.lab = Lab.script();
const Hapi = require('hapi');
const redirectModule = require('../index.js');

lab.experiment('hapi-redirect', () => {
  let server;

  lab.beforeEach((done) => {
    server = new Hapi.Server();
    server.connection();
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
          reply('vhost redirects totally working ');
        }
      },
      {
        method: 'GET',
        path: '/newtest/{param*2}',
        handler: (request, reply) => {
          reply(`redirects totally working and param passed was ${request.params.param}`);
        }
      }
    ]);

    server.start(done);
  });

  lab.afterEach((done) => {
    server.stop(done);
  });

  lab.test(' /test -> /it/works   /something/else -> /it/works', (done) => {
    server.register({
      register: redirectModule,
      options: {
        redirects: {
          '/test': '/it/works',
          '/something/else': '/it/works'
        },
      }
    },
    () => {
      server.start(() => {
        server.inject({
          method: 'get',
          url: '/test'
        }, (result) => {
          Code.expect(result.statusCode).to.equal(301);
          Code.expect(result.headers.location).to.equal('/it/works');
          server.inject({
            method: 'get',
            url: '/something/else'
          }, (testResult) => {
            Code.expect(testResult.statusCode).to.equal(301);
            Code.expect(testResult.headers.location).to.equal('/it/works');
            done();
          });
        });
      });
    });
  });

  lab.test(' / -> /it/works?test=1', (done) => {
    server.register({
      register: redirectModule,
      options: {
        redirects: {
          '/': '/it/works?test=1',
        },
      }
    },
    () => {
      server.start(() => {
        server.inject({
          method: 'get',
          url: '/'
        }, (result) => {
          Code.expect(result.statusCode).to.equal(301);
          Code.expect(result.headers.location).to.equal('/it/works?test=1');
          done();
        });
      });
    });
  });

  lab.test(' / -> /to/{params*}', (done) => {
    server.register({
      register: redirectModule,
      options: {
        appendQueryString: false,
        redirects: {
          '/{params*}': '/to/{params*}',
        },
      }
    },
    () => {
      server.start(() => {
        server.inject({
          method: 'get',
          url: '/some/params/here'
        }, (result) => {
          Code.expect(result.statusCode).to.equal(301);
          Code.expect(result.headers.location).to.equal('/to/some/params/here');
          done();
        });
      });
    });
  });

  lab.test(' /?query=1 -> /it/works?query=1', (done) => {
    server.register({
      register: redirectModule,
      options: {
        redirects: {
          '/': '/it/works',
        },
      }
    },
    () => {
      server.start(() => {
        server.inject({
          method: 'get',
          url: '/?query=1'
        }, (result) => {
          Code.expect(result.statusCode).to.equal(301);
          Code.expect(result.headers.location).to.equal('/it/works?query=1');
          done();
        });
      });
    });
  });

  lab.test(' /from/{param}/?query=1 -> /to/{param}?query=1', (done) => {
    server.register({
      register: redirectModule,
      options: {
        redirects: {
          '/from/{param*}': '/to/{param*}',
        },
      }
    },
    () => {
      server.start(() => {
        server.inject({
          method: 'get',
          url: '/from/test?query=1'
        }, (result) => {
          Code.expect(result.statusCode).to.equal(301);
          Code.expect(result.headers.location).to.equal('/to/test?query=1');
          done();
        });
      });
    });
  });

  lab.test(' /from/{param}/?query=1 -> /to/{param}?query=1', (done) => {
    server.register({
      register: redirectModule,
      options: {
        redirects: {
          '/from/{param*}': '/to/{param*}',
        },
      }
    },
    () => {
      server.start(() => {
        server.inject({
          method: 'get',
          url: '/from/myParam?query=1'
        }, (result) => {
          Code.expect(result.statusCode).to.equal(301);
          Code.expect(result.headers.location).to.equal('/to/myParam?query=1');
          done();
        });
      });
    });
  });

  lab.test(' /test/{params*2} -> /newtest/{param*2}', (done) => {
    server.register({
      register: redirectModule,
      options: {
        redirects: {
          '/test/{param*2}': '/newtest/{param*2}'
        },
      }
    },
    () => {
      server.start(() => {
        server.inject({
          method: 'get',
          url: '/test/param1/param2',
          headers: {
            Host: 'en.example.com'
          },
        }, (result) => {
          Code.expect(result.statusCode).to.equal(301);
          Code.expect(result.headers.location).to.equal('/newtest/param1/param2');
          done();
        });
      });
    });
  });

  lab.test(' blahblah.localhost.com/test -> /newtest', (done) => {
    server.register({
      register: redirectModule,
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
    },
    () => {
      server.start(() => {
        server.inject({
          method: 'get',
          url: '/test',
          headers: {
            Host: 'blahblah.com.localhost'
          }
        }, (result) => {
          Code.expect(result.statusCode).to.equal(301);
          Code.expect(result.headers.location).to.equal('/newtest');
          done();
        });
      });
    });
  });

  lab.test('expose plugin', (done) => {
    server.register({
      register: redirectModule,
      options: {
        log: true,
        log404: true
      }
    }, () => {
      server.plugins['hapi-redirects'].register({
        redirects: {
          '/test': '/it/works'
        },
        vhosts: {
          'blahblah.com.localhost': {
            '/test': '/newtest',
          }
        }
      }, () => {
        server.start(() => {
          server.inject({
            method: 'get',
            url: '/test',
            headers: {
              Host: 'blahblah.com.localhost'
            }
          }, (result) => {
            Code.expect(result.statusCode).to.equal(301);
            Code.expect(result.headers.location).to.equal('/newtest');
            done();
          });
        });
      });
    });
  });

  lab.test('set default status code', (done) => {
    server.register({
      register: redirectModule,
      options: {
        statusCode: 302,
        redirects: {
          '/': '/it/works',
        },
      }
    },
    () => {
      server.start(() => {
        server.inject({
          method: 'get',
          url: '/'
        }, (result) => {
          Code.expect(result.statusCode).to.equal(302);
          done();
        });
      });
    });
  });

  lab.test(' set status code for specific route (without params)', (done) => {
    server.register({
      register: redirectModule,
      options: {
        redirects: {
          '/test301': '/it/works',
          '/test302': {
            destination: '/it/works',
            statusCode: 302
          }
        },
      }
    },
    () => {
      server.start(() => {
        server.inject({
          method: 'get',
          url: '/test302'
        }, (result) => {
          Code.expect(result.statusCode).to.equal(302);
          Code.expect(result.headers.location).to.equal('/it/works');
          server.inject({
            method: 'get',
            url: '/test301'
          }, (result2) => {
            Code.expect(result2.statusCode).to.equal(301);
            Code.expect(result2.headers.location).to.equal('/it/works');
            done();
          });
        });
      });
    });
  });

  lab.test(' set status code for specific route (with params)', (done) => {
    server.register({
      register: redirectModule,
      options: {
        redirects: {
          '/test/{param*2}': {
            destination: '/newtest/{param*2}',
            statusCode: 302
          }
        },
      }
    },
    () => {
      server.start(() => {
        server.inject({
          method: 'get',
          url: '/test/param1/param2',
          headers: {
            Host: 'en.example.com'
          },
        }, (result) => {
          Code.expect(result.statusCode).to.equal(302);
          Code.expect(result.headers.location).to.equal('/newtest/param1/param2');
          done();
        });
      });
    });
  });

  lab.test(' set status code for specific route (with vhost) ', (done) => {
    server.register({
      register: redirectModule,
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
    },
    () => {
      server.start(() => {
        server.inject({
          method: 'get',
          url: '/test',
          headers: {
            Host: 'blahblah.com.localhost'
          }
        }, (result) => {
          Code.expect(result.statusCode).to.equal(302);
          Code.expect(result.headers.location).to.equal('/newtest');
          done();
        });
      });
    });
  });

  lab.test(' accepts a callback that adds additional dynamic routes', (done) => {
    let count = 0;
    server.register({
      register: redirectModule,
      options: {
        log: true,
        log404: true,
        redirects: {
          '/test301': '/it/works',
        },
        getRedirects(pluginOptions, redirectDone) {
          // dynamic method takes callback from the plugin:
          Code.expect(pluginOptions.log).to.equal(true);
          count++;
          return redirectDone(null, {
            '/test': {
              destination: `/newtest${count}`,
              statusCode: 302
            }
          });
        }
      }
    },
    () => {
      server.inject({
        method: 'get',
        url: '/test'
      }, (result) => {
        Code.expect(result.statusCode).to.equal(302);
        Code.expect(result.headers.location).to.equal('/newtest1');
        server.inject({
          method: 'get',
          url: '/test'
        }, (result2) => {
          Code.expect(result2.statusCode).to.equal(302);
          Code.expect(result2.headers.location).to.equal('/newtest2');
          // static routes still work:
          server.inject({
            method: 'get',
            url: '/test301'
          }, (result3) => {
            Code.expect(result3.statusCode).to.equal(301);
            Code.expect(result3.headers.location).to.equal('/it/works');
            done();
          });
        });
      });
    });
  });

  lab.test('emits event when redirect occurs', (done) => {
    server.register({
      register: redirectModule,
      options: {
        redirects: {
          '/test': '/it/works',
          '/something/else': '/it/works'
        },
      }
    },
    () => {
      server.on('redirect', (redirectInfo) => {
        Code.expect(redirectInfo).to.equal('/it/works');
        done();
      });
      server.start(() => {
        server.inject({
          method: 'get',
          url: '/test'
        }, (result) => {
          Code.expect(result.statusCode).to.equal(301);
          Code.expect(result.headers.location).to.equal('/it/works');
        });
      });
    });
  });

  lab.test(' returns 404 if no route or redirect matches', (done) => {
    server.register({
      register: redirectModule,
      options: {
      }
    },
    () => {
      server.start(() => {
        server.inject({
          method: 'get',
          url: '/test'
        }, (result) => {
          Code.expect(result.statusCode).to.equal(404);
          done();
        });
      });
    });
  });
});
