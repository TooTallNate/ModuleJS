module.main.exports.setTitle("Defined Dependancies");

module.define('defined', {"foo": "yes it was!"});
module.load('defined', function(def) {
  console.log('Was defined module loaded: ' + def.foo);
});
