'use strict';
const useragent = require('useragent');
const paramReplacer = require('./paramReplacer');
const Call = require('call');
const querystring = require('query-string');
const { parse } = require('url');

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
  const processRedirect = async(request, routeSpec, match = false) => {
    // get all the info for doing the redirect from the route spec:
    const statusCode = routeSpec.statusCode || options.statusCode;
    const routePath = typeof routeSpec === 'string' ? routeSpec : routeSpec.destination;
    const route = request.route.path;
    const redirectTo = paramReplacer(routePath, match ? match.params : request.params);
    const redirectToUrl = parse(redirectTo, true);
    // lump all queries together:
    const allQueries = Object.assign({}, request.query, redirectToUrl.query);
    // if needed, add the queries to the parsed url:
    if (Object.keys(allQueries).length > 0) {
      redirectToUrl.search = `?${querystring.stringify(allQueries)}`;
    }
    // let the url parser format the correct redirect Location:
    const fullRedirectLocation = redirectToUrl.format();

    let from = request.path;
    if (Object.keys(request.query).length !== 0) {
      from = `${from}?${querystring.stringify(request.query)}`;
    }
    // log the route info:
    server.log(['hapi-redirect', 'redirect', 'info'], {
      remoteAddress: `${request.info.remoteAddress}:${request.info.remotePort}`,
      host: request.info.host,
      userAgent: request.headers['user-agent'],
      browser: useragent.parse(request.headers['user-agent']).toString(),
      referrer: request.info.referrer,
      routePath: route,
      to: fullRedirectLocation,
      from
    });

    // now emit the event and do the redirect:
    await server.events.emit('redirect', (request, fullRedirectLocation));
    return { statusCode, fullRedirectLocation };
  };

  // let them add additional routes:
  server.expose('register', (additionalRoutes) => {
    // support both '{ /path: /redirect}' and { redirects : { /path: /redirect} }
    additionalRoutes = additionalRoutes.redirects || additionalRoutes;
    Object.keys(additionalRoutes).forEach(path => {
      server.route({
        method: '*',
        path,
        async handler(request, h) {
          const { statusCode, fullRedirectLocation } = await processRedirect(request, additionalRoutes[path]);
          return h.redirect(fullRedirectLocation).code(statusCode);
        }
      });
    });
  });

  if (options.redirects) {
    server.plugins['hapi-redirects'].register(options.redirects);
  }

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
    const { statusCode, fullRedirectLocation } = await processRedirect(request, routeSpec, match);
    return h.redirect(fullRedirectLocation).code(statusCode).takeover();
  });
};
