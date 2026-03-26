.PHONY: test test-unit test-smoke test-all test-ci pre-demo

test: test-unit

test-unit:
	python -m pytest tests/ -v -m "not smoke" --tb=short -q

test-smoke:
	API_BASE_URL=$(API_BASE_URL) python -m pytest tests/test_demo_readiness.py -v -m smoke

test-all:
	python -m pytest tests/ -v --tb=short

test-ci:
	python -m pytest tests/ -v -m "not smoke" --tb=short --junitxml=test-results.xml

pre-demo: test-unit
	@echo "Unit tests passed. Starting smoke tests..."
	@echo "Make sure API is running at $(API_BASE_URL) before continuing."
	$(MAKE) test-smoke
