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
    _.each(request.params, function(param, paramName){
      redirectTo = replaceRouteParamWithValues(redirectTo, paramName, param);
    });
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

var ParamMatchingRegEx = new RegExp("(\\{)((?:[a-z][a-z0-9_]*))(\\*)(\\d+)(\\})" , "i");
function replaceRouteParamWithValues(route, paramName, paramValue){
  // replace the most-common types of param:
  route = route.replace("{" + paramName + "}", paramValue).replace("{" + paramName + "?}", paramValue).replace("{" + paramName + "*}", paramValue);
  // match and replaces params of the form "{myParam*2}, {myParam*4}" as well:
  var matchedValue = _.first(ParamMatchingRegEx.exec(route));
  if (matchedValue) return route.replace(matchedValue, paramValue);
  return route;
}

module.exports.attributes = {
  name: 'hapi-redirects',
  pkg: require('../package.json')
};
