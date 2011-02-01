module.load('./three.js', './two.js', function(three, two) {
  print("Logging from 'one.js'");
  print('two.works: ' + two.works);
  print( three.times(5) );

  exports.three = three;
  this.another = 1;
});
