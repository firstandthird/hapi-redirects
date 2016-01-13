var _ = require('lodash');

var defaults = {
  statusCode: 301,
  appendQueryString: true,
  log: false,
  log404: false
};

module.exports = function(server, options, next) {
  _.defaults(options, defaults);

  // if it's a simple redirect with no vhost then it goes in undefined:
  var lookupRedirectsByVhost = {
    undefined : {}
  };
  var redirector = function(request, reply) {
    var routePath = request.route.path;
    var vhost = request.route.settings.vhost;
    var redirectTo = lookupRedirectsByVhost[vhost][routePath];
    _.each(request.params, function(param, paramName){
      redirectTo = replaceRouteParamWithValues(redirectTo, paramName, param);
    });
    if (options.appendQueryString && request.url.search) {
      redirectTo += request.url.search;
    }
    if(redirectTo) {
      if (options.log) {
        server.log(['hapi-redirects'], {
          remoteAddress : request.info.remoteAddress + ':' + request.info.remotePort,
          host : request.info.host,
          referrer : request.info.referrer,
          routePath: routePath,
          from: request.path,
          to: redirectTo
        });
      }
      return reply.redirect(redirectTo).code(options.statusCode);
    }
    server.log(['hapi-redirects', 'error'], { path: request.path, vhost : vhost });
    reply(new Error('invalid redirect'));
  };
  var registerRoute = function(path, vhost, dest){
    var routeDefinition =  {
      path: path,
      method: 'GET',
      config: {
        handler: redirector
      }
    };
    if (vhost) {
      routeDefinition.vhost = vhost;
    }
    if (!lookupRedirectsByVhost[vhost]){
      lookupRedirectsByVhost[vhost] = {};
    }
    lookupRedirectsByVhost[vhost][path] = dest;
    return routeDefinition;
  };
  var registerRoutes = function(routeList, vhost){
    var routes = [];
    for(var route in routeList) {
      routes.push(registerRoute(route, vhost, routeList[route]));
    }
    return routes;
  };
  var registerAll = function(package, done){
    // register non-vhost routes:
    server.route(registerRoutes(package.redirects, undefined));
    // register vhost-specific routes:
    server.route(_.reduce(package.vhosts, function(memo, routeList, vhost){
      memo = _.union(memo, registerRoutes(routeList, vhost));
      return memo;
    },[]));
    done();
  };
  server.expose('register', registerAll);

  registerAll(options, function(){
    if (options.log404) {
      server.on('tail', function(request) {
        var response = request.response;
        if (response.statusCode == 404) {
          server.log(['hapi-redirects'], { statusCode: 404, path: request.path });
        }
      });
    }
    next();
  });
};

var ParamMatchingRegEx = new RegExp('(\\{)((?:[a-z][a-z0-9_]*))(\\*)(\\d+)(\\})' , 'i');
function replaceRouteParamWithValues(route, paramName, paramValue){
  // replace the most-common types of param:
  route = route.replace('{' + paramName + '}', paramValue).replace('{' + paramName + '?}', paramValue).replace('{' + paramName + '*}', paramValue);
  // match and replaces params of the form "{myParam*2}, {myParam*4}" as well:
  var matchedValue = _.first(ParamMatchingRegEx.exec(route));
  if (matchedValue) {
    return route.replace(matchedValue, paramValue);
  }
  return route;
}

module.exports.attributes = {
  name: 'hapi-redirects',
  pkg: require('../package.json')
};
