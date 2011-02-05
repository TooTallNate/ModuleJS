module.main.exports.setTitle("Cyclic Dependencies");

// Cyclic dependencies are supported with the idea of a "top-level"
// exports followed by another module definition with cyclic dependencies.
// Thus, a module that has cyclic dependencies (that is, a dependency that itself
// depends on this module) will have at least two `module.load()` calls.


// The first `module.load`'s factory is executed immediately. This is where you
// can set up any `exports` that WILL BE available to the cyclic dependencies.
module.load(function() {

  exports.test = true;


  // The second call to `module.load` is where you can specify your dependencies.
  // It's better to not set anything onto your `exports` object at this point,
  // as only the first call is guaranteed to be visible to other modules.
  module.load('./cyclic', function(cyclic) {

    console.log(cyclic);
    console.log("Done!");

  });
});
