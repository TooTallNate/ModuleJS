load(['./two.js'], function(two) {
  console.log("Logging from 'one.js'");
  console.log(two);

  exports.one = two;
  this.another = 1;
});
