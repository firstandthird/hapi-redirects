const ParamMatchingRegEx = new RegExp('(\\{)((?:[a-z][a-z0-9_]*))(\\*)(\\d+)(\\})', 'i');

const replaceRouteParamWithValues = (route, paramName, paramValue) => {
  // replace the most-common types of param:
  route = route.replace(`{${paramName}}`, paramValue)
  .replace(`{${paramName}?}`, paramValue)
  .replace(`{${paramName}*}`, paramValue);

  // match and replaces params of the form "{myParam*2}, {myParam*4}" as well:
  const matchedValue = ParamMatchingRegEx.exec(route);

  if (matchedValue) {
    return route.replace(matchedValue[0], paramValue);
  }

  return route;
};

module.exports = (route, params) => {
  Object.keys(params).forEach((paramName) => {
    route = replaceRouteParamWithValues(route, paramName, params[paramName]);
  });

  return route;
};
