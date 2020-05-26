#!/bin/bash

dev [no-dll=true] [entry=\"a b c\"]         开发模式\n\
install                                     安装/更新依赖\n\
buildNode                                   打包node代码\n\
buildPC                                     打包前端代码\n\
deploy                                      部署代码\n\

# Build dev arguments
dev_args =
ifdef no-dll
	dev_args := $(dev_args) --no-dll
endif
ifdef entry
	dev_args := $(dev_args) $(foreach item,$(entry),-e $(item))
endif

# step print
define printStep
@echo "\033[1;33mPC-SHARED:\033[0m $1"
endef

# Must be the first target!
default:
	@echo $(usage)

# 检验版本依赖
check-yarn-version:
	./scripts/check-yarn-version.sh

install: check-yarn-version
	yarn --registry=http://registry.npm.qima-inc.com --disturl=https://npm.taobao.org/dist

# PC fixme
dev:
	cd packages/webpack && yarn dev -- $(dev_args)

# PC
buildPC:
	$(call printStep, "[PC BUILD] START")
	@rm -rf static/build
	@cd packages/webpack && yarn deploy
	$(call printStep, "[PC BUILD] END")

# Node
buildNode:
	$(call printStep, "[NODE BUILD] START")
	@rm -rf ./dist
	$(call printStep, "[1/3] dist removed success")
	@cd packages/node && npx tsc --project tsconfig.pkg.json
	$(call printStep, "[2/3] tsc build success")
	@cp -R packages/node/app/views ./dist/app
	@cp -R packages/node/config ./dist/
	@cp packages/node/app.yaml ./dist/
	@cp packages/node/package.json ./dist/
	@cp packages/node/README_DIST.md ./dist/README.md
	$(call printStep, "[3/3] copy others to dist success")
	$(call printStep, "[NODE BUILD] END")

# DEPLOY NODE ONLY
deployNode: buildNode
	@./scripts/deploy.sh

# DEPLOY
deploy: buildPC buildNode
	@./scripts/deploy.sh







