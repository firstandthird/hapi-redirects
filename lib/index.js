module.exports = function(plugin, options, next) {
  
  if(!options.redirects) {
    options.redirects = {};
  }

  var routes = [];

  var redirector = function(request, reply) {
    if(options.redirects[request.path]) {
      return reply.redirect(options.redirects[request.path]);
    }

    reply();
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

  plugin.route(routes);

  next();
};

module.exports.attributes = {
  name: 'hapi-redirects',
  pkg: require('../package.json')
};