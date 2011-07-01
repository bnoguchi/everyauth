TESTS = $(shell find test/ -name '*.test.js')

test:
	node $(TESTS)

.PHONY: test
