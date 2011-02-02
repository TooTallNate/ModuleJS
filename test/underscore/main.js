module.load('underscore', function(_) {
  console.log(_.map([1, 2, 3], function(n){ return n * 2; }));
  console.log("Done!");
});
