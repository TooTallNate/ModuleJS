ModuleJS
========
### Asynchronous [CommonJS][] Module Loader for web-browsers.

This script allows the use of "modules" within your JavaScript (usually
web application).

It uses [SandboxJS][] underneath the hood in order to execute modules within
their own, isolated, JavaScript scope. This means that executed modules do NOT
have access to the global `window` or `document` objects, unless the page author
explicitly allows it.


Writing a Module
----------------

A "module" is simply a JavaScript file that exports objects (i.e. functionality) for
other modules to use.

A top-level module doesn't depend on any other modules, and
simply assigns properties to the global `exports` object for others to use:

    // foo.js
    exports.upper = function(str) { return str.toUpperCase(); }

Any other module that depends on other modules MUST use the `module.load()` function to
explicity specify which modules it depends on. The `exports` of the required modules
are passed in as arguments:

    // bar.js
    module.load('./foo', function(foo) {
      console.log(foo.upper("test"));
        // "TEST"
    });

In the case of `bar.js`, the callback ("factory") function won't be executed until after
the dependency list has been satisfied.


The "main" module
-----------------

Accessible as `module.main`; the "main" module is everything that your export in
the global scope. Since by default your module has no access to anything except
JavaScript primitives, you might want to export some hooks into your web app in the
global scope (custom logging, etc.).

To load other modules, `module.load`! This may be done in an inline `<script>` block
or a standalone 'main' module (i.e. a `<script src="main.js">`, note the name isn't
important). A standalone module would be different in the sense that it still is
part of the regular brower global scope.

So to complete the `foo.js/bar.js` example above, this would be a basic `index.html`:

    <!DOCTYPE HTML>
    <html>
      <head>
        <script type="text/javascript" src="Sandbox.js"></script>
        <script type="text/javascript" src="Module.js"></script>
        <script type="text/javascript">

          module.load('./bar', function(bar) {
            console.log("Done!");
          });

        </script>
      </head>
      <body>

      </body>
    </html>



[SandboxJS]: https://github.com/TooTallNate/SandboxJS
[CommonJS]: http://wiki.commonjs.org/wiki/Modules
