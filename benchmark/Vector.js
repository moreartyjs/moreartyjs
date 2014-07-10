var config = require('../package.json');
var Morearty = require('../dist/morearty-' + config.version);
var Vector = Morearty.Data.Vector;
var Util = Morearty.Util;
var TestUtil = require('../test/TestUtil');
var Mori = require('mori');

var SIZE = 1000;

var moreartyTests = {
  prepend: function (size) {
    var vec = Vector;
    for (var i = 0; i < size; i++) {
      vec = vec.prepend(TestUtil.genRandomString());
    }
    return vec;
  },

  append: function (size) {
    var vec = Vector;
    for (var i = 0; i < size; i++) {
      vec = vec.append(TestUtil.genRandomString());
    }
    return vec;
  }
};
moreartyTests.sample = moreartyTests.append(SIZE);

var moriTests = {
  prepend: function (size) {
    var vec = Mori.vector();
    for (var i = 0; i < size; i++) {
      vec = Mori.assoc(vec, 0, TestUtil.genRandomString());
    }
    return vec;
  },

  append: function (size) {
    var vec = Mori.vector();
    for (var i = 0; i < size; i++) {
      vec = Mori.conj(vec, TestUtil.genRandomString());
    }
    return vec;
  }
};
moriTests.sample = moreartyTests.append(SIZE);

module.exports = {
  name: 'Morearty.Data.Vector compared to Mori.vector',
  tests: {
    'Morearty vector prepend': function () {
      moreartyTests.prepend(SIZE);
    },
    'Mori vector prepend': function () {
      moriTests.prepend(SIZE);
    },
    'Morearty vector append': function () {
      moreartyTests.append(SIZE);
    },
    'Mori vector append': function () {
      moriTests.append(SIZE);
    },
    'Morearty vector get': function () {
      moreartyTests.sample.get(TestUtil.genRandomNumber(0, SIZE - 1))
    },
    'Mori vector get': function () {
      Mori.get(moriTests.sample, TestUtil.genRandomNumber(0, SIZE - 1))
    }
  }
};
