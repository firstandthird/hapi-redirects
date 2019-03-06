'use strict';
const Call = require('call');

const defaults = {
  statusCode: 301,
  appendQueryString: true,
  log: false,
  log404: false,
  verbose: false
};

module.exports = (server, pluginOptions) => {
  const options = Object.assign({}, defaults, pluginOptions);
  if (options.statusCode === 'temporary') {
    options.statusCode = 302;
  }
  if (options.statusCode === 'permanent') {
    options.statusCode = 301;
  }
  server.event('redirect');

  // turn a redirect into a redirection URL and a status code:
  const processRedirect = require('./processRedirect');

  // let them add additional routes:
  server.expose('register', (additionalRoutes) => {
    // support both '{ /path: /redirect}' and { redirects : { /path: /redirect} }
    additionalRoutes = additionalRoutes.redirects || additionalRoutes;
    Object.keys(additionalRoutes).forEach(path => {
      if (!path.startsWith('/')) {
        additionalRoutes[`/${path}`] = additionalRoutes[path];
        path = `/${path}`;
      }
      server.route({
        method: '*',
        path,
        async handler(request, h) {
          const { statusCode, fullRedirectLocation } = await processRedirect(request, additionalRoutes[path], server, options);
          return h.redirect(fullRedirectLocation).code(statusCode);
        }
      });
    });
  });

  if (options.redirects) {
    server.plugins['hapi-redirects'].register(options.redirects);
  }

  if (options.dynamicRedirects) {
    server.ext('onPreResponse', async (request, h) => {
      // does not interfere if it's not a 404 error
      if ((request.response.statusCode && request.response.statusCode !== 404) || (request.response.isBoom && request.response.output.statusCode !== 404)) {
        return h.continue;
      }
      // if it's 404 then look up a redirect, first get dynamic redirects:
      const dynamicRedirects = options.dynamicRedirects ? options.dynamicRedirects : (redirectOptions) => [];

      // the plugin options will be passed to your custom 'dynamicRedirects' function:
      let dynamicRouteTable;
      try {
        dynamicRouteTable = await dynamicRedirects(options);
      } catch (err) {
        server.log(['hapi-redirect', 'error'], err);
        return h.continue;
      }
      const router = new Call.Router();
      const path = request.path;

      // load the routes:
      Object.keys(dynamicRouteTable).forEach((source) => {
        router.add({ method: 'get', path: source });
      });
      // try to match the incoming route:
      const host = request.headers.host;
      const match = router.route('get', path, host);
      if (!match.route) {
        return h.continue;
      }
      // get the spec data for the matching route from either vhost or the route table:
      const routeSpec = dynamicRouteTable[match.route];
      const { statusCode, fullRedirectLocation } = await processRedirect(request, routeSpec, server, options, match);
      return h.redirect(fullRedirectLocation).code(statusCode).takeover();
    });
  }
};
