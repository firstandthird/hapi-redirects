const register = require('./lib/index');

exports.plugin = {
  register,
  once: true,
  pkg: require('./package.json')
};
