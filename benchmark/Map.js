var config = require('../package.json');
var Morearty = require('../dist/morearty-' + config.version);
var Map = Morearty.Data.Map;
var Util = Morearty.Util;
var TestUtil = require('../test/TestUtil');
var Mori = require('mori');

var SIZE = 1000;

var createZeroFilledArray = function (size) {
  return [].slice.apply(new Uint8Array(new Array(size)));
};

var keys = createZeroFilledArray(SIZE).map(function () { return TestUtil.genRandomString(); });

var moreartyTests = {
  fill: function () {
    var map = Map;
    for (var i = 0; i < keys.length; i++) {
      map = map.assoc(keys[i], TestUtil.genRandomString());
    }
    return map;
  }
};
moreartyTests.sample = moreartyTests.fill();

var moriTests = {
  fill: function () {
    var map = Mori.hash_map();
    for (var i = 0; i < keys.length; i++) {
      map = Mori.assoc(map, keys[i], TestUtil.genRandomString());
    }
    return map;
  }
};
moriTests.sample = moriTests.fill();

module.exports = {
  name: 'Morearty.Data.Map compared to Mori.hash_map',
  tests: {
    'Morearty map assoc': function () {
      moreartyTests.fill();
    },
    'Mori map assoc': function () {
      moriTests.fill();
    },
    'Morearty map get': function () {
      moreartyTests.sample.get(keys[TestUtil.genRandomNumber(0, SIZE - 1)])
    },
    'Mori map get': function () {
      Mori.get(moriTests.sample, keys[TestUtil.genRandomNumber(0, SIZE - 1)])
    }
  }
};
