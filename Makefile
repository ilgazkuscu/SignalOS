.PHONY: run dev build test typecheck benchmark validate install ingest features train backtest api frontend docker

run:
	./run.sh

dev:
	npm run dev

build:
	npm run build

test:
	npm test

typecheck:
	npm run typecheck

benchmark:
	npm run benchmark

validate:
	npm run lint
	npm run typecheck
	npm test
	npm run build
	npm run benchmark

install:
	pip install -r requirements.txt
	cd frontend && npm install

ingest:
	python scripts/run_ingest.py --once

features:
	python -c "from signalos.features.pipeline import build_all; build_all()"

train:
	python scripts/run_train.py

backtest:
	python scripts/run_backtest.py --loo

api:
	uvicorn signalos.api.main:app --reload

frontend:
	cd frontend && npm run dev

docker:
	docker-compose up --build
