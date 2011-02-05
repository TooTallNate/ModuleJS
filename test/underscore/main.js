module.main.exports.setTitle('Underscore');

// Use `module.provide` to create a "preset" to a module. This function doesn't
// create the module, nor retrieve it over the network. But if the name is used as
// a dependency in ANY module after this call, then the absolute URL here will be used.
module.provide('underscore', 'http://documentcloud.github.com/underscore/underscore.js');

// So since this is an absolute id (no './' at the beginning), the id "underscore"
// will be resolved to the absolute URL specified in the `provide` call.
module.load('underscore', function(_) {
  console.log(_.map([1, 2, 3], function(n){ return n * 2; }));
  console.log("Done!");
});
