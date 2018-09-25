const paramReplacer = require('./paramReplacer');
const querystring = require('query-string');
const { parse } = require('url');
const useragent = require('useragent');

module.exports = async(request, routeSpec, server, options, match = false) => {
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
