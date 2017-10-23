'use strict';
const useragent = require('useragent');
const paramReplacer = require('./paramReplacer');
const Call = require('call');
const querystring = require('query-string');

const defaults = {
  statusCode: 301,
  appendQueryString: true,
  log: false,
  log404: false,
  verbose: false
};

module.exports = (server, pluginOptions, next) => {
  const options = Object.assign({}, defaults, pluginOptions);
  server.event('redirect');

  // let them add additional routes:
  server.expose('register', (additionalRoutes, callback) => {
    options.redirects = Object.assign({}, options.redirects, additionalRoutes.redirects);
    options.vhosts = Object.assign({}, options.vhosts, additionalRoutes.vhosts);
    callback();
  });

  server.ext('onPreResponse', (request, reply) => {
    // does not interfere if it's not a 404 error
    if ((request.response.statusCode && request.response.statusCode !== 404) || (request.response.isBoom && request.response.output.statusCode !== 404)) {
      return reply.continue();
    }
    // if it's 404 then look up a redirect, first get dynamic redirects:
    const getRedirects = options.getRedirects ? options.getRedirects : (redirectOptions, callback) => { callback(null, []); };

    // the plugin options will be passed to your custom 'getRedirects' function:
    getRedirects(options, (err, dynamicRouteTable) => {
      if (err) {
        server.log(['hapi-redirect', 'error'], err);
        return reply.continue();
      }
      // if any routes are duplicates throw an error:
      const duplicateRoutes = Object.keys(dynamicRouteTable).reduce((list, key) => {
        if (Object.keys(options.redirects).indexOf(key) !== -1) {
          list.push(key);
        }
        return list;
      }, []);
      if (duplicateRoutes.length !== 0) {
        server.log(['hapi-redirect', 'error'], `the following routes are already registered: ${duplicateRoutes}`);
        return reply().code(500);
      }

      // combine the dynamic and static redirects:
      const redirectTable = Object.assign({}, dynamicRouteTable, options.redirects);
      const router = new Call.Router();
      const route = request.route.path;
      const path = request.path;

      // load the routes:
      Object.keys(redirectTable).forEach((source) => {
        router.add({ method: 'get', path: source });
      });
      // also load routes that have a vhost:
      if (options.vhosts) {
        Object.keys(options.vhosts).forEach((vhost) => {
          Object.keys(options.vhosts[vhost]).forEach((source) => {
            router.add({ method: 'get', path: source, vhost });
          });
        });
      }
      // try to match the incoming route:
      const host = request.headers.host;
      const match = router.route('get', path, host);
      if (!match.route) {
        return reply.continue();
      }
      // get the spec data for the matching route from either vhost or the route table:
      const routeSpec = (options.vhosts && options.vhosts[host]) ?
        options.vhosts[host][match.route] : redirectTable[match.route];
      // get all the info for doing the redirect from the route spec:
      const statusCode = routeSpec.statusCode || options.statusCode;
      const routePath = typeof routeSpec === 'string' ? routeSpec : routeSpec.destination;
      const redirectTo = paramReplacer(routePath, match.params);
      const query = (Object.keys(request.query).length > 0) ? `?${querystring.stringify(request.query)}` : '';
      const fullRedirectLocation = `${redirectTo || route.destination}${query}`;

      // log the route info:
      server.log(['hapi-redirect', 'redirect', 'info'], {
        remoteAddress: `${request.info.remoteAddress}:${request.info.remotePort}`,
        host: request.info.host,
        userAgent: request.headers['user-agent'],
        browser: useragent.parse(request.headers['user-agent']).toString(),
        referrer: request.info.referrer,
        routePath: route,
        to: fullRedirectLocation,
        from: request.path
      });

      // now emit the event and do the redirect:
      server.emit('redirect', (request, fullRedirectLocation));
      reply.redirect(fullRedirectLocation).code(statusCode);
    });
  });
  next();
};

module.exports.attributes = {
  name: 'hapi-redirects',
  pkg: require('../package.json')
};
