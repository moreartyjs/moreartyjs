define(function() {

  return {

    Util: require('Util'),

    Data: {
      Map: require('data/Map'),
      Vector: require('data/Vector'),
      Util: require('data/Util')
    },

    Binding: require('Binding'),

    History: require('History'),

    Callback: require('util/Callback'),

    createContext: require('Morearty').createContext

  };

});
