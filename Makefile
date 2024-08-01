.PHONY: install dev start check fix test build

install: node_modules pnpm-lock.yaml

node_modules: package.json apps/demo/package.json apps/deno-demo/package.json apps/node-demo/package.json libs/qwikdev-astro/package.json libs/create-qwikdev-astro/package.json
	pnpm install -r --frozen-lockfile

pnpm-lock.yaml: package.json apps/demo/package.json apps/deno-demo/package.json apps/node-demo/package.json libs/qwikdev-astro/package.json libs/create-qwikdev-astro/package.json
	pnpm update -r

dev: install
	pnpm dev

start: install
	pnpm start

check: install
	pnpm check

test: check
	pnpm test

fix: install
	pnpm fix

build: fix
	pnpm build
