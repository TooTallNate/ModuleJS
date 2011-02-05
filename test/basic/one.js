module.load('./three', './two', function(three, two) {
  console.log("Logging from 'one.js'");
  console.log('two.works: ' + two.works);
  console.log( three.times(5) );

  exports.three = three;
  this.another = 1;
});
