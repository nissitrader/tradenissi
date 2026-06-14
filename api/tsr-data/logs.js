const { proxyTsrData } = require("../../lib/tsr-data-proxy");

module.exports = (request, response) => proxyTsrData(request, response, "logs");
