var _ = require('lodash');

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
    var vhost = request.route.settings.vhost;
    if (vhost)
      redirectTo = options.vhosts[vhost] ? options.vhosts[vhost][routePath] : undefined
    if(redirectTo) {
      if (log) {
        server.log(['hapi-redirects'], { routePath: routePath, from: request.path, to: redirectTo, vhost: vhost });
      }
      return reply.redirect(redirectTo);
    }
    server.log(['hapi-redirects', 'error'], { path: request.path, vhost : vhost });
    reply(new Error('invalid redirect'));
  };

  function registerRoute(path, vhost){
    var routeDefinition =  {
      path: path,
      method: 'GET',
      config: {
        handler: redirector
      }
    }
    if (vhost)
      routeDefinition.vhost = vhost;
    routes.push(routeDefinition);
  }
  function registerRoutes(routeList, vhost){
    for(var route in routeList) {
        registerRoute(route, vhost);
    }
  }
  // register vhost-specific routes:
  _.each(options.vhosts, function(routeList, vhost){
    registerRoutes(routeList, vhost)
  })
  // register everything else:
  registerRoutes(options.redirects, null);

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
