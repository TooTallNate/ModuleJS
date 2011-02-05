(function() {
  var test = location.search.substring(1);

  if (typeof(test) == 'string' && test.length > 0) {

    // A custom function to set the title of the test case
    exports.setTitle = function(title) {
      document.title = 'ModuleJS Test: ' + title;
    }

    window.onload = function() {
      document.body.innerHTML = "";
      module.load('./'+test+'/main', function(main) {
      });
    }

  }

})();
