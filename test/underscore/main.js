load(['http://documentcloud.github.com/underscore/underscore.js'], function(_) {
  console.log(_.map([1, 2, 3], function(n){ return n * 2; }));
});
