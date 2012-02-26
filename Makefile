TESTS = $(shell find test/ -name '*.test.js')

test:
	mocha --reporter spec $(TESTS)

.PHONY: test
