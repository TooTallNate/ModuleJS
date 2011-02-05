// When a dependency is specified with a '/' at the end, it is
// assumed to be a directory name. So the dependency loaded
// should be "$DIRNAME/index.js".

module.load('./test/', function(testDir) {
  console.log(testDir);
});
