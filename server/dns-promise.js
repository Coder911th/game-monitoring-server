const
  dns = require('dns');

module.exports = function(domain) {
  return new Promise((resolve, reject) => {
    dns.lookup(domain, (error, address, family) =>
      error
        ? reject()
        : resolve({ address, family })
    );
  });
};