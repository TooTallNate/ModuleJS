module.main.exports.setTitle("Basic Dependencies");

module.load('./one', './two', function(one, two) {
  console.log(one.another);
  console.log('two.works:', two.works);
});
