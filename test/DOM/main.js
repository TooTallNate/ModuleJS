// This is a simple test that is meant to demonstrate the ability
// interact with the 'document' instance from the global scope.
//
// Thus, the line:  `exports.document = document;`
// or something similar should be done in your main module.

module.load('./DOM', function(DOM) {

  // A wrapper for 'document.createElement()'
  var foo = new (DOM.Element)('h1');

  // Sets the 'innerHTML'
  foo.update('It Works! <a href="../index.html">Go Back</a>');

  // Appends to the <body> tag
  DOM.insert(foo);

});
