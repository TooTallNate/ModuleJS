module.main.exports.setTitle("Defined Dependencies");

module.define('defined', {"foo": "yes it was!"});
module.load('defined', function(def) {
  console.log('Was defined module loaded: ' + def.foo);
});
