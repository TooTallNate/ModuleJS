var connect = require('connect');
module.exports = connect.createServer(
  connect.logger(),
  connect.staticProvider(__dirname)
);
