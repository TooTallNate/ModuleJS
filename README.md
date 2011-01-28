ModuleJS
========
### Asynchronous [CommonJS][] Module Loader for web-browsers.

This script allows the use of "modules" within your JavaScript (usually
web application).

It uses [SandboxJS][] underneath the hood in order to execute modules within
their own, isolated, JavaScript scope.


Writing a Module
----------------

A "module" is simply a JavaScript file that exports objects (i.e. functionality) for
other modules to use.

A top-level module doesn't depend on any other modules, and
simply assigns properties to the global `exports` object for others to use:

    // foo.js
    exports.upper = function(str) { return str.toUpperCase(); }

Any other module that depends on other modules MUST use the `load()` function to
explicity specify which modules it depends on:

    // bar.js
    load(['foo.js'], function(foo) {
      console.log(foo.upper("test"));
        // "TEST"
    });

In the case of `bar.js`, the callback ("factory") function won't be executed until after
the dependency list has been satisfied.

[SandboxJS]: https://github.com/TooTallNate/SandboxJS
[CommonJS]: http://wiki.commonjs.org/wiki/Modules
