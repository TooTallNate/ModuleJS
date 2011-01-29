load('./one.js', './two.js', function(one, two) {
  print(one.another);
  console.log(two);
});
