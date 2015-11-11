module.exports = function(server, options, next) {

  if(!options.redirects) {
    options.redirects = {};
  }

  var log = options.log;
  var log404 = options.log404;

  var routes = [];

  var redirector = function(request, reply) {
    var routePath = request.route.path;
    var redirectTo = options.redirects[routePath];
    if(redirectTo) {
      if (log) {
        server.log(['hapi-redirects'], {
          remoteAddress : request.info.remoteAddress + ":" + request.info.remotePort,
          host : request.info.host,
          referrer : request.info.referrer,
          routePath: routePath,
          from: request.path,
          to: redirectTo
        });
      }
      return reply.redirect(redirectTo);
    }

    server.log(['hapi-redirects', 'error'], { path: request.path });
    reply(new Error('invalid redirect'));
  };

  for(var route in options.redirects) {
    routes.push({
      path: route,
      method: 'GET',
      config: {
        handler: redirector
      }
    });
  }

  server.route(routes);

  if (log404) {
    server.on('tail', function(request) {
      var response = request.response;
      if (response.statusCode == 404) {
        server.log(['hapi-redirects'], { statusCode: 404, path: request.path });
      }
    });
  }
  next();
};

module.exports.attributes = {
  name: 'hapi-redirects',
  pkg: require('../package.json')
};
