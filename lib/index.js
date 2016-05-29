'use strict';
const _ = require('lodash');

const defaults = {
  statusCode: 301,
  appendQueryString: true,
  log: false,
  log404: false,
  verbose: false
};

const ParamMatchingRegEx = new RegExp('(\\{)((?:[a-z][a-z0-9_]*))(\\*)(\\d+)(\\})', 'i');

const replaceRouteParamWithValues = (route, paramName, paramValue) => {
  // replace the most-common types of param:
  route = route.replace(`{${paramName}}`, paramValue)
  .replace(`{${paramName}?}`, paramValue)
  .replace(`{${paramName}*}`, paramValue);
  // match and replaces params of the form "{myParam*2}, {myParam*4}" as well:
  const matchedValue = _.first(ParamMatchingRegEx.exec(route));
  if (matchedValue) {
    return route.replace(matchedValue, paramValue);
  }
  return route;
};

module.exports = (server, options, next) => {
  _.defaults(options, defaults);

  // if it's a simple redirect with no vhost then it goes in undefined:
  const lookupRedirectsByVhost = {
    undefined: {}
  };
  const redirector = (request, reply) => {
    const routePath = request.route.path;
    const vhost = request.route.settings.vhost;
    let redirectTo = lookupRedirectsByVhost[vhost][routePath];
    _.each(request.params, (param, paramName) => {
      redirectTo = replaceRouteParamWithValues(redirectTo, paramName, param);
    });
    if (options.appendQueryString && request.url.search) {
      redirectTo += request.url.search;
    }
    if (redirectTo) {
      if (options.log) {
        server.log(['hapi-redirects'], {
          remoteAddress: `${request.info.remoteAddress}:${request.info.remotePort}`,
          host: request.info.host,
          referrer: request.info.referrer,
          routePath,
          from: request.path,
          to: redirectTo
        });
      }
      return reply.redirect(redirectTo).code(options.statusCode);
    }
    server.log(['hapi-redirects', 'error'], { path: request.path, vhost });
    reply(new Error('invalid redirect'));
  };
  const registerRoute = (path, vhost, dest) => {
    const routeDefinition = {
      path,
      method: 'GET',
      config: {
        handler: redirector
      }
    };
    if (vhost) {
      routeDefinition.vhost = vhost;
    }
    if (!lookupRedirectsByVhost[vhost]) {
      lookupRedirectsByVhost[vhost] = {};
    }
    lookupRedirectsByVhost[vhost][path] = dest;
    if (options.verbose) {
      server.log(['hapi-redirects', 'debug'], {
        message: 'registering route',
        route: routeDefinition });
    }
    return routeDefinition;
  };
  const registerRoutes = (routeList, vhost) => {
    const routes = [];
    _.each(routeList, (v, route) => {
      routes.push(registerRoute(route, vhost, routeList[route]));
    });
    return routes;
  };
  const registerAll = (bundle, done) => {
    // register non-vhost routes:
    server.route(registerRoutes(bundle.redirects, undefined));
    // register vhost-specific routes:
    server.route(_.reduce(bundle.vhosts, (memo, routeList, vhost) => {
      memo = _.union(memo, registerRoutes(routeList, vhost));
      return memo;
    }, []));
    done();
  };
  server.expose('register', registerAll);

  registerAll(options, () => {
    if (options.log404) {
      server.on('tail', (request) => {
        const response = request.response;
        if (response.statusCode === 404) {
          server.log(['hapi-redirects'], { statusCode: 404, path: request.path });
        }
      });
    }
    next();
  });
};

module.exports.attributes = {
  name: 'hapi-redirects',
  pkg: require('../package.json')
};
