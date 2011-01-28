(function() {
  // cache of loaded/loading modules
  var modules = {};

  function getModule(path) {
    var m = modules[path];
    if (!m) {
      m = modules[path] = new Module(path);
    }

    return m;
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

    self.global.exports = self.exports = {};
    self.global.load = function(deps, factory) {
      self._deps = deps;
      self._factory = factory;
    }
    self.global.console = console;

    // load the remote script
    self.load(self.path, function() {
      self._onLoad.apply(self, arguments);
    });
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
      console.log("ModuleJS: Module DIDN'T call 'load()': " + this.path);

      // Module has no dependencies...
      this._notifyLoaded();
    }
  }
  Module.prototype.addListener = function(callback) {
    this.loadListeners.push(callback);
  }
  Module.prototype._checkDeps = function(err) {
    var self = this;
    var loaded = true;
    for (var i=0, l=self._modules.length; i<l; i++) {
      var m = self._modules[i];
      if (!m.loaded) {
        loaded = false;
      }
    }
    if (loaded) this._notifyLoaded();
  }
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
  Module.prototype._executeFactory = function() {
    console.log("ModuleJS: Executing Module Factory: " + this.path);

    // At this point, we know that any deps are loaded
    var exports = [];
    for (var i=0, l=this._modules.length; i<l; i++) {
      exports[i] = this._modules[i].exports;
    }
    this.global.__deps = exports;
    this.global.__factory = this._factory;
    this.eval('__factory.apply(exports, __deps)');
    delete this.global.__deps;
    delete this.global.__factory;
  }
  Module.prototype._absolutize = function(dep) {
    return dep;
  }

  // Extends a the prototype of a Constructor Function
  // with the prototype of a Super Function
  function extend(con, super) {
    function bare() {}
    bare.prototype = super.prototype;
    con.prototype = new bare;
    con.prototype.constructor = con;
  }


  // The "load" function. Available at the global level
  // of every module. Can/Should be used to define any
  // dependencies of a module before executing the factory
  function start(path) {
    new Module(path);
  }
  //window['load'] = load;
  window['start'] = start;
})();

