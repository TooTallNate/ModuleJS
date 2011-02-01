module.load('underscore', function(_) {
  print(_.map([1, 2, 3], function(n){ return n * 2; }));
});
