(function() {
  // cache of loaded/loading modules
  var modules = {};

  // Gets a module from the cache based on it's absolute path
  function getModule(path) {
    var m = modules[path];
    if (!m) {
      m = modules[path] = new Module(path);
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
    Sandbox.apply(self, arguments);
    self.loadListeners = [];
    self.path = absolutePath;
    self.loaded = false;

    var module = {};
    var exports = {};
    self.module = module;
    self.exports = exports;
    module.exports = exports;

    self.global.module = module;
    self.global.exports = exports;
    self.global.load = function(deps, factory) {
      if (!isArray(deps)) {
        var argc = arguments.length;
        deps = Array.prototype.slice.call(arguments, 0, argc-1);
        factory = arguments[argc-1];
      }
      self._deps = deps;
      self._factory = factory;
    }
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
  // Internal function that gets called after the script is
  // loaded into the sandbox. It first checks if the loading
  // was successful, then checks to see if the module's "load"
  // function was called, defining a factory function and any
  // dependencies.
  Module.prototype._onLoad = function(err) {
    console.log("ModuleJS: Module <script> onload, path: " + this.path);

    if (err) {
      console.log("ModuleJS: Module failed to load: " + this.path);

      // Module failed to load!
      this._notifyLoaded(err);
      return;
    }

    var self = this;
    if (this._deps && this._deps.length > 0) {
      console.log("ModuleJS: Module has depencencies: " + this.path + ", " + this._deps);

      this._modules = [];
      for (var i=0, l=this._deps.length; i<l; i++) {
        var m = getModule(this._absolutize(this._deps[i]));
        if (!m.loaded) {
          m.addListener(function() {
            self._checkDeps.apply(self, arguments);
          });
        }
        this._modules.push(m);
      }
      this._checkDeps();
    } else {
      console.log("ModuleJS: Module did not call 'load()': " + this.path);

      if (this.module.exports !== this.exports) {
        console.log("ModuleJS: 'module.exports' was set: " + this.path);
        // 'module.exports' property was directly set, outside of 'load()'
        this.exports = this.module.exports;
      }

      // Module has no dependencies...
      this._notifyLoaded();
    }
  }
  // Add a listener. Currently the only event is 'load', which need-not be specified
  Module.prototype.addListener = function(callback) {
    this.loadListeners.push(callback);
  }
  // Called immediately after the script loads from the remote,
  // and once every time one of the module's defined dependencies
  // fires off it's load event. If all required deps have finished
  // loading, then it's time for this module to finish loading
  Module.prototype._checkDeps = function(err) {
    var self = this;
    var loaded = true;
    for (var i=0, l=self._modules.length; i<l; i++) {
      var m = self._modules[i];
      if (!m.loaded) {
        loaded = false;
        break;
      }
    }
    if (loaded) this._notifyLoaded();
  }
  // Called after all dependencies have been satisfied. If a
  // factory function had been defined in the 'load()' call,
  // then it is invoked. Then all load listeners for this module
  // are notified. Also sets the 'loaded' flag to true
  Module.prototype._notifyLoaded = function(err) {
    this.loaded = true;
    this.error = err;
    if (this._factory) {
      this._executeFactory();
    }
    console.log("ModuleJS: Notifying Module Listeners: " + this.path);

    var li = this.loadListeners;
    for (var i=0, l=li.length; i<l; i++) {
      li[i](err);
    }
  }
  // Executes the factory function that was defined in the 'load()'
  // call. It first collects the 'exports' of all dependency modules,
  // then evals the factory function in the module's isolated scope.
  // The return value is checked, as well as 'module.exports' to see
  // if they were set, which will override 'exports' if set.
  Module.prototype._executeFactory = function() {
    console.log("ModuleJS: Executing Module Factory: " + this.path);

    // At this point, we know that any deps are loaded, so get the
    // 'exports' object from the loaded Module instance.
    var deps = [];
    for (var i=0, l=this._modules.length; i<l; i++) {
      deps[i] = this._modules[i].exports;
    }
    this.global.__deps = deps;
    this.global.__factory = this._factory;
    // Eval in the module's isolated Sandbox
    var rtn = this.eval('__factory.apply(exports, __deps)');
    delete this.global.__deps;
    delete this.global.__factory;
    if (this.module.exports !== this.exports) {
      console.log("ModuleJS: 'module.exports' was set: " + this.path);
      // 'module.exports' property was directly set
      this.exports = this.module.exports;
    } else if (!!rtn && rtn !== this.exports) {
      console.log("ModuleJS: Object returned from factory function: " + this.path);
      // something was 'return'ed from the factory function
      this.exports = rtn;
    }
  }
  // Returns an absolutized version of the dependency name, based on
  // this module's base path, etc. '..', '.', are normalized.
  Module.prototype._absolutize = function(dep) {
    return dep;
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

  // For testing. API will most definitely change...
  function start(path) {
    new Module(path);
  }
  window['start'] = start;

  window['Module'] = Module;
})();
