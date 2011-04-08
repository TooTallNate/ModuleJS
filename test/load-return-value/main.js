// This test ensures that a loaded module (this one) can use the
// return value of `module.load()` to access the 'Module' instances.

var m = module.load('./another', function(){});
console.log(m.length + " ← should be '1'");

// This property should be visible at the top-level of the module's scope.
m[0].global.visible = true;
