(function() {
  // cache of loaded/loading modules
  var cache = {};

  // Holds absolute module ids into translated absolute URLs. This
  // is useful for predetermined module ids to go to specific URLs.
  var provides = {};

  // Add a pre-defined module ID / URL combo. Example:
  //    module.provide('underscore', 'http://localhost/js/underscore.js');
  // In a Module:
  //    module.load('underscore', function(_) { ... });
  function provide(id, url) {
    provides[id] = url;
  }
  

  // Gets a module from the cache based on it's absolute path
  function getModule(path) {
    var m = cache[path];
    if (!m) {
      m = cache[path] = new Module(path);
    }
    return m;
  }

  // Fake `console.log()` function, available to modules
  var apply = Function.prototype.apply;
  function log() {
    // proxy to the native `console.log` if it exists
    var c = window['console'];
    if (!!c && c['log']) {
      apply.call(c['log'], c, arguments);
    }
    // Also add logging statements into an HTML tag on the page
    // with 'id="console"'
    var cEle = document.getElementById("console");
    if (!cEle) return;
    for (var i=0, l=arguments.length; i<l; i++) {
      var text = document.createTextNode(String(arguments[i]) + '\n');
      cEle.appendChild(text);
    }
  }

  // The Module class is instantiated once per module
  // that gets loaded. It has an absolute path, an "exports"
  // Object that gets injected into the module's sandbox scope.
  function Module(absolutePath) {
    log("ModuleJS: "+absolutePath+": Creating Module");

    var self = this;
    Sandbox.call(self, true);
    self.loadListeners = [];
    self.loaded = false;

    createModule.call(self, absolutePath);

    self.global.module = self.module;
    self.global.exports = self.exports;
    self.global.console = {
      'log': log
    }

    // HACK: Firefox (probably others) seem to need us to wait
    // a few ms before adding the <script> to the <iframe>
    setTimeout(function() {
      // load the remote script, invoke '_onLoad' when it finishes
      self.load(absolutePath, function(err) {
        self._onLoad(err);
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
    var self = this;
    log("ModuleJS: "+self.id+": Module <script> onload");

    if (!self._loadCalled) {
      log("ModuleJS: "+self.id+": Module did not call 'load()'");

      if (self.module.exports !== self.exports) {
        log("ModuleJS: "+self.id+": `module.exports` was set at the top-level");
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

    log("ModuleJS: "+this.id+": Notifying Module Listeners");
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
    var parsed = parseUri(id);
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
      
      log("ModuleJS: "+self.id+": `module.load("+deps+")` being called");
      self._loadCalled = true;

      var _modules = [];
      for (var i=0, l=deps.length; i<l; i++) {
        var m = getModule(absolutize(parsed, deps[i]));
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
      log("ModuleJS: "+self.id+": Executing Module Factory");

      // At this point, we know that any deps are loaded, so get the
      // 'exports' object from the loaded Module instance.
      var deps = [];
      for (var i=0, l=_modules.length; i<l; i++) {
        deps[i] = _modules[i].exports;
      }
      self.global._deps = deps;
      self.global._factory = factory;
      // Eval in the module's isolated Sandbox
      var rtn = self.eval('(function() { '+
        'var rtn = _factory.apply(exports, _deps);'+
        'delete _deps;'+
        'delete _factory;'+
        'return rtn; })()');
      if (self.module.exports !== self.exports) {
        // 'module.exports' property was directly set
        log("ModuleJS: "+self.id+": `module.exports` was set inside factory");
        self.exports = self.module.exports;
      } else if (!!rtn && rtn !== self.exports) {
        // something was 'return'ed from the factory function
        log("ModuleJS: "+self.id+": Object returned from factory function");
        self.exports = rtn;
      }
    }


  }




  var DEFAULT_EXTENSION = '.js';
  var EXTENSION_CHECK = new RegExp('^.*\\'+DEFAULT_EXTENSION+'$');
  var ABSOLUTE_URL_CHECK = /:\/\//;
  function absolutize(parsed, dep) {
    // First check the `module.provide` case
    if (dep in provides) return provides[dep];

    if (!EXTENSION_CHECK.test(dep)) {
      dep += DEFAULT_EXTENSION;
    }
    if (ABSOLUTE_URL_CHECK.test(dep)) {
      return dep;
    }

    var rtn = parsed.protocol + '://' + parsed.authority;
    if (dep[0] == '/') { // Based on root
      rtn += dep;
    } else { // A relative dependency
      rtn += realpath(parsed.directory + dep);
    }
    return rtn;
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

  // Part of EcmaScript 5, not implemented (yet) in most browsers...
  var isArray = Array.isArray || function (array) {
    return Object.prototype.toString.call(array) === '[object Array]';
  }

  // Respectfully borrowed from BravoJS.
  // Canonicalize path, compacting slashes and dots per basic UNIX rules.
  // Treats paths with trailing slashes as though they end with 'index.js'.
  // Not rigorous.
  function realpath(path) {

    var oldPath = path.split('/');
    var newPath = [];

    if (path.charAt(path.length - 1) === '/')
      oldPath.push("index.js");

    for (var i = 0; i < oldPath.length; i++) {
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

  // parseUri 1.2.2
  // (c) Steven Levithan <stevenlevithan.com>
  // http://blog.stevenlevithan.com/archives/parseuri
  // MIT License
  function parseUri (str) {
    var o   = parseUri.options,
      m   = o.parser.exec(str),
      uri = {},
      i   = o.key.length;

    while (i--) uri[o.key[i]] = m[i] || "";

    if (uri['query']) {
      uri[o.q.name] = {};
      uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
        if ($1) uri[o.q.name][$1] = $2;
      });
    }

    return uri;
  }
  parseUri.options = {
    key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
    q:   {
      name:   "queryKey",
      parser: /(?:^|&)([^&=]*)=?([^&]*)/g
    },
    parser: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/
  };




  // Make the global window be a pseudo-module
  createModule.call(window, location.href);

  // Expose `module.provide` to the global scope ('main' module)
  window.module.provide = provide;

  if (window['global'] !== window)
    window['global'] = window;
})();
