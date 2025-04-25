SERVER_DIR=./server
CLIENT_DIR=./client


.phony: run-server run-client install dev

install:
	- cd $(CLIENT_DIR) && pnpm install

run-server:
	- cd $(SERVER_DIR) && fastapi dev main.py

run-client:
	- cd $(CLIENT_DIR) && pnpm run dev

dev:
	- @make -j run-server run-client