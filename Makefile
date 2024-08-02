.PHONY: install dev start check fix test build release pr-release

install: node_modules pnpm-lock.yaml

node_modules: package.json apps/demo/package.json apps/deno-demo/package.json apps/node-demo/package.json libs/qwikdev-astro/package.json libs/create-qwikdev-astro/package.json
	pnpm install --frozen-lockfile

pnpm-lock.yaml: package.json apps/demo/package.json apps/deno-demo/package.json apps/node-demo/package.json libs/qwikdev-astro/package.json libs/create-qwikdev-astro/package.json
	pnpm update -r
	pnpm fix

dev: install
	pnpm dev

start: install
	pnpm start

check: install
	pnpm check

test: build check
	pnpm test

fix: install
	pnpm fix

build: fix
	pnpm build

pr-release: test
	pnpx pkg-pr-new publish ./libs/* --template ./libs/create-qwikdev-astro/stubs/templates/default/*

release: test
	pnpm release
