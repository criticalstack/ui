all: prod

prod:
	@npm run build:prod

dev:
	@npm run build:dev

lint:
	@npm run lint

install:
	npm install --only=prod

install-dev:
	npm install

audit:
	@echo "Auditing (non-dev) node_modules/updating..."
	@npm audit fix --only=prod

install-linux-deps:
	sudo apt install libpng-dev -y

clean:
	rm -rf node_modules
	rm -rf build
	rm -f package-lock.json
