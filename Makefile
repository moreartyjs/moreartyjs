TSD = node_modules/tsd/build/cli.js
TSC = node_modules/typescript/bin/tsc
TS_TESTS = test/ts/ts_tests_compiled

all: install ts-test

install:
	npm install
	$(TSD) query mocha --save --action install
	$(TSD) query chai --save --action install

ts-test:
	npm link morearty
	$(TSC) test/**/*.ts -m commonjs --outDir $(TS_TESTS) && mocha $(TS_TESTS)
