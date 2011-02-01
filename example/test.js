module.load('./one', './two', function(one, two) {
  print(one.another);
  print('two.works: ' + two.works);
});
