// This is a module that depends on a 'cyclic dependency' module,
// which is how we've set up 'main.js'. The top-level exports of
// 'main' should be available to this module like usual.

module.load('./main', function(main) {
  console.log("From 'cyclic.js': " + main.test);
  module.exports = main.test;
});
