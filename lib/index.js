module.exports = function(server, options, next) {
  
  if(!options.redirects) {
    options.redirects = {};
  }

  var log = options.log;

  var routes = [];

  var redirector = function(request, reply) {
    if(options.redirects[request.path]) {
      var redirectTo = options.redirects[request.path];
      if (log) {
        server.log(['hapi-redirects'], { from: request.path, to: redirectTo });
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

  next();
};

module.exports.attributes = {
  name: 'hapi-redirects',
  pkg: require('../package.json')
};
