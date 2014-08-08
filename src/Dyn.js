define([], function () {

  var callbacks = {};
  var modules = {};

  return {

    onRegisterModule: function (name, cb) {
      callbacks[name] = callbacks[name] || [];
      callbacks[name].push(cb);
    },

    registerModule: function (name, module) {
      modules[name] = module;
      if (callbacks[name]) {
        callbacks[name].forEach(function (cb) {
          cb(module);
          delete callbacks[name];
        });
      }
    }

  };

});
