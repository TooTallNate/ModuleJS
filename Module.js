(function() {
  // cache of loaded/loading modules
  var cache = {};

  // Gets a module from the cache based on it's absolute path
  function getModule(path) {
    var m = cache[path];
    if (!m) {
      m = cache[path] = new Module(path);
    }
    return m;
  }

  // Logging function, since I can't seem to get `console.log` to work in the modules...
  function print() {
    for (var i=0, l=arguments.length; i<l; i++) {
      document.getElementById("stdout").innerHTML += arguments[i] + '\n';
    }
  }

  // The Module class is instantiated once per module
  // that gets loaded. It has an absolute path, an "exports"
  // Object that gets injected into the module's sandbox scope.
  function Module(absolutePath) {
    console.log("ModuleJS: Creating Module, path: " + absolutePath);

    var self = this;
    Sandbox.call(self, true);
    self.loadListeners = [];
    self.path = absolutePath;
    self.loaded = false;

    createModule.call(self, absolutePath);

    self.global.module = self.module;
    self.global.exports = self.exports;
    self.global.print = print;

    // HACK: Firefox (probably others) seem to need us to wait
    // a few ms before adding the <script> to the <iframe>
    setTimeout(function() {
      // load the remote script, invoke '_onLoad' when it finishes
      self.load(self.path, function() {
        self._onLoad.apply(self, arguments);
      });
    }, 50);
  }
  extend(Module, Sandbox);

  // Expose the module cache. `module.load('Module', function(Module) {})`
  // will get you a reference to the Module constructor.
  Module.cache = cache;

  // Internal function that gets called after the script is
  // loaded into the sandbox. It first checks if the loading
  // was successful, then checks to see if the module's "load"
  // function was called, defining a factory function and any
  // dependencies.
  Module.prototype._onLoad = function(err) {
    console.log("ModuleJS: Module <script> onload, path: " + this.path);

    var self = this;
    if (!self._loadCalled) {
      console.log("ModuleJS: Module did not call 'load()': " + this.path);

      if (self.module.exports !== self.exports) {
        console.log("ModuleJS: 'module.exports' was set at top-level: " + this.path);
        // 'module.exports' property was directly set, outside of 'load()'
        self.exports = self.module.exports;
      }

      // Module has no dependencies...
      self._notifyLoaded();
    }
  }

  // Add a listener. Currently the only event is 'load', which need-not be specified
  Module.prototype.addListener = function(callback) {
    this.loadListeners.push(callback);
  }

  // Called after all dependencies have been satisfied. If a
  // factory function had been defined in the 'load()' call,
  // then it is invoked. Then all load listeners for this module
  // are notified. Also sets the 'loaded' flag to true
  Module.prototype._notifyLoaded = function() {
    if (this['loaded']) return; // only notify listeners once

    console.log("ModuleJS: "+this.path+": Notifying Module Listeners");
    this['loaded'] = true;

    var li = this.loadListeners;
    for (var i=0, l=li.length; i<l; i++) {
      li[i]();
    }
    delete this.loadListeners;
  }



  ///////////////////////////////////////////////////////////////////////////////
  // this function shares the module loading logic with the Module class and the
  // global 'main' module (the Window). 'this' is either a 'Module' instance or
  // the global Window object.
  function createModule(id) {
    var self = this;
    self['id'] = id;
    // Set up the 'exports' object
    self['exports'] = {};
    // Set up the 'module' object
    self['module'] = {
      'exports': self.exports,
      'load': load,
      'id': id
    };

    // The 'module.load' function. Accepts an array of module ids that are
    // dependencies. If/Once they're all loaded, the 'factory' function is invoked
    // `module.load` is allowed to be called multiple times in a module, but only
    // a call during the top-level execution of the script will have it's 'exports'
    // properly visisble to other modules.
    function load(deps, factory) {
      if (!isArray(deps)) {
        var argc = arguments.length;
        deps = Array.prototype.slice.call(arguments, 0, argc-1);
        factory = arguments[argc-1];
      }
      
      console.log("ModuleJS: "+self.path+": `module.load("+deps+")` being called");
      self._loadCalled = true;

      var _modules = [];
      for (var i=0, l=deps.length; i<l; i++) {
        var m = getModule(deps[i]+'.js');
        if (!m.loaded) {
          m.addListener(function() {
            checkDeps(_modules, factory);
          });
        }
        _modules.push(m);
      }
      checkDeps(_modules, factory);
    }

    // Called during `module.load`, and once for every dependency that still
    // needs to be loaded's load callback
    function checkDeps(_modules, factory) {
      var loaded = true;
      for (var i=0, l = _modules.length; i<l; i++) {
        var m = _modules[i];
        if (!m.loaded) {
          loaded = false;
          break;
        }
      }
      if (loaded) {
        if (factory) {
          executeFactory(_modules, factory); 
        }
        if (self._notifyLoaded) // Not on the global 'main' module
          self._notifyLoaded();
      }
    }

    // Executes the specifies factory function with the specified module dependencies
    function executeFactory(_modules, factory) {
      console.log("ModuleJS: "+self.path+": Executing Module Factory");

      // At this point, we know that any deps are loaded, so get the
      // 'exports' object from the loaded Module instance.
      var deps = [];
      for (var i=0, l=_modules.length; i<l; i++) {
        deps[i] = _modules[i].exports;
      }
      self.global._deps = deps;
      self.global._factory = factory;
      // Eval in the module's isolated Sandbox
      var rtn = self.eval('var rtn = _factory.apply(exports, _deps);delete _deps; delete _factory; rtn');
      if (self.module.exports !== self.exports) {
        // 'module.exports' property was directly set
        console.log("ModuleJS: "+self.path+": `module.exports` was set inside factory");
        self.exports = self.module.exports;
      } else if (!!rtn && rtn !== self.exports) {
        // something was 'return'ed from the factory function
        console.log("ModuleJS: "+self.path+": Object returned from factory function");
        self.exports = rtn;
      }
    }


  }





  // Extends a the prototype of a Constructor Function
  // with the prototype of a Super Function
  function extend(con, sup) {
    function bare() {}
    bare.prototype = sup.prototype;
    con.prototype = new bare;
    con.prototype.constructor = con;
    bare = undefined;
  }

  // Not implemented in most browsers...
  function isArray(array) {
    return Object.prototype.toString.call(array) === '[object Array]';
  }

  // Respectfully borrowed from BravoJS.

  /** Canonicalize path, compacting slashes and dots per basic UNIX rules.
   *  Treats paths with trailing slashes as though they end with INDEX instead.
   *  Not rigorous. */
  function realpath(path) {
    if (typeof path !== "string")
      path = path.toString();

    var oldPath = path.split('/');
    var newPath = [];
    var i;

    if (path.charAt(path.length - 1) === '/')
      oldPath.push("INDEX");

    for (i = 0; i < oldPath.length; i++) {
      if (oldPath[i] == '.' || !oldPath[i].length)
        continue;
      if (oldPath[i] == '..') {
        if (!newPath.length)
          throw new Error("Invalid module path: " + path);
        newPath.pop();
        continue;
      }
      newPath.push(oldPath[i]);
    }

    newPath.unshift('');
    return newPath.join('/');
  }

  /** Extract the non-directory portion of a path */
  function basename(path) {
    if (typeof path !== "string")
      path = path.toString();

    var s = path.split('/').slice(-1).join('/');
    if (!s)
      return path;
    return s;
  }

  /** Extract the directory portion of a path */
  function dirname(path) {
    if (typeof path !== "string")
      path = path.toString();

    if (path.charAt(path.length - 1) === '/')
      return path.slice(0,-1);

    var s = path.split('/').slice(0,-1).join('/');
    if (!s)
      return ".";

    return s;
  }

  function normalize(base, name) {

  }

  // Make the global window be a pseudo-module
  createModule.call(window, location.href);
  window['global'] = window;
})();
