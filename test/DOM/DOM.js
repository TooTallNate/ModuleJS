// This module takes abstracts the global 'document' instance
// into it's own classes/functions. This is very barebones, for
// testing/demonstration purposes, but you can see how something
// like this can be expanded on.


// Get an instance to the global 'document'.
var d = module.main.exports.document;


// The 'Element' class is a wrapper around 'document.createElement()'
function Element(type) {
  console.log("creating a <"+type+">");
  this.type = type;
  this.ele = d.createElement(type);
  console.log(this.ele);
}

Element.prototype.update = function(d) {
  return (this.ele.innerHTML = d);
}

exports.Element = Element;


// The 'insert' function adds an 'Element' instance into the global
// scope's 'document.body'.

exports.insert = function insert(element) {
  console.log("appending <"+element.type+"> to <body>");
  return d.body.insertBefore(element.ele, d.body.firstChild);
}
