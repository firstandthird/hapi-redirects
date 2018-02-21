'use strict';
const useragent = require('useragent');
const paramReplacer = require('./paramReplacer');
const Call = require('call');
const querystring = require('query-string');
const url = require('url');

const defaults = {
  statusCode: 301,
  appendQueryString: true,
  log: false,
  log404: false,
  verbose: false
};

module.exports = async (server, pluginOptions) => {
  const options = Object.assign({}, defaults, pluginOptions);
  if (options.statusCode === 'temporary') {
    options.statusCode = 302;
  }
  if (options.statusCode === 'permanent') {
    options.statusCode = 301;
  }
  server.event('redirect');

  // let them add additional routes:
  server.expose('register', async (additionalRoutes) => {
    options.redirects = Object.assign({}, options.redirects, additionalRoutes.redirects);
    options.vhosts = Object.assign({}, options.vhosts, additionalRoutes.vhosts);
  });

  server.ext('onPreResponse', async (request, h) => {

    // does not interfere if it's not a 404 error
    if ((request.response.statusCode && request.response.statusCode !== 404) || (request.response.isBoom && request.response.output.statusCode !== 404)) {
      return h.continue;
    }
    // if it's 404 then look up a redirect, first get dynamic redirects:
    const getRedirects = options.getRedirects ? options.getRedirects : async (redirectOptions) => [];

    // the plugin options will be passed to your custom 'getRedirects' function:
    let dynamicRouteTable
    try {
      dynamicRouteTable = await getRedirects(options);
    } catch (err) {
      server.log(['hapi-redirect', 'error'], err);
      return h.continue;
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
      return h.response().code(500).takeover();
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
      return h.continue;
    }
    // get the spec data for the matching route from either vhost or the route table:
    const routeSpec = (options.vhosts && options.vhosts[host]) ?
      options.vhosts[host][match.route] : redirectTable[match.route];
    // get all the info for doing the redirect from the route spec:
    const statusCode = routeSpec.statusCode || options.statusCode;
    const routePath = typeof routeSpec === 'string' ? routeSpec : routeSpec.destination;
    const redirectTo = paramReplacer(routePath, match.params);
    const redirectToUrl = url.parse(redirectTo, true);
    const allQueries = Object.assign({}, request.query, redirectToUrl.query);
    const query = (Object.keys(allQueries).length > 0) ? `?${querystring.stringify(allQueries)}` : '';
    const redirectLocation = (redirectToUrl.href.startsWith('https://') || redirectToUrl.href.startsWith('http://')) ? redirectToUrl.href : redirectToUrl.pathname;
    const fullRedirectLocation = `${redirectLocation || route.destination}${query}`;
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
    await server.events.emit('redirect', (request, fullRedirectLocation));

    return h.redirect(fullRedirectLocation).code(statusCode).takeover();
  });
};
