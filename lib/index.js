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
  server.ext('onPreResponse', (request, reply) => {
    // does not interfere if it's not a 404 error
    if ((request.response.statusCode && request.response.statusCode !== 404) || (request.response.isBoom && request.response.output.statusCode !== 404)) {
      return reply.continue();
    }
    const getRedirects = options.getRedirects ? options.getRedirects : (redirectSlug, callback) => { callback(null, []); };
    // if it's 404 then look up a redirect:
    getRedirects(options.redirectSlug, (err, dynamicRouteTable) => {
      if (err) {
        server.log(['hapi-redirect', 'error'], err);
        return reply.continue();
      }
      const redirectTable = Object.assign({}, dynamicRouteTable, options.redirects);
      const router = new Call.Router();
      const route = request.route.path;
      const path = request.path;

      const logData = {
        remoteAddress: `${request.info.remoteAddress}:${request.info.remotePort}`,
        host: request.info.host,
        userAgent: request.headers['user-agent'],
        browser: useragent.parse(request.headers['user-agent']).toString(),
        referrer: request.info.referrer,
        routePath: route,
        from: request.path
      };

      // load the routes:
      Object.entries(redirectTable).forEach(([paramName, param]) => {
        router.add({ method: 'get', path: paramName });
      });

      // also load routes that have a vhost:
      if (options.vhosts) {
        Object.keys(options.vhosts).forEach((vhost) => {
          Object.entries(options.vhosts[vhost]).forEach(([paramName, param]) => {
            router.add({ method: 'get', path: paramName, vhost });
          });
        });
      }
      const host = request.headers.host;
      const match = router.route('get', path, host);
      if (!match.route) {
        return reply.continue();
      }
      let redirectTo;
      if (host && options.vhosts[host]) {
        redirectTo = paramReplacer(options.vhosts[host][match.route], match.params);
      } else {
        redirectTo = paramReplacer(redirectTable[match.route], match.params);
      }
      logData.to = redirectTo;
      server.log(['hapi-redirect', 'redirect', 'info'], logData);
      const query = (Object.keys(request.query).length > 0) ? `?${querystring.stringify(request.query)}` : '';
      const statusCode = redirectTable[match.route].statusCode || options.statusCode;
      const fullRedirectLocation = `${redirectTo.destination || redirectTo}${query}`;
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
