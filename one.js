load(['./two.js'], function(two) {
  print("Logging from 'one.js'");
  print('two.works: ' + two.works);

  exports.one = two;
  this.another = 1;
});
