CACHE_DIR := ".cache"
FONT_CACHE_DIR := CACHE_DIR / "fonts"
PUBLIC_FONT_DIR := "public/fonts"
WENKAI_VERSION := "1.522"
XIHEI_VERSION := "1.242"
WENKAI_FONT_FILE := "LXGWWenKai-Regular.ttf"
XIHEI_FONT_FILE := "LXGWNeoXiHei-Regular.ttf"
WENKAI_CACHE_FILE := FONT_CACHE_DIR / WENKAI_FONT_FILE
XIHEI_CACHE_FILE := FONT_CACHE_DIR / XIHEI_FONT_FILE
WENKAI_PUBLIC_FILE := PUBLIC_FONT_DIR / WENKAI_FONT_FILE
XIHEI_PUBLIC_FILE := PUBLIC_FONT_DIR / XIHEI_FONT_FILE
WENKAI_CACHE_EXISTS := path_exists(WENKAI_CACHE_FILE)
XIHEI_CACHE_EXISTS := path_exists(XIHEI_CACHE_FILE)

@font:
    mkdir -p {{ FONT_CACHE_DIR }} {{ PUBLIC_FONT_DIR }}
    {{ WENKAI_CACHE_EXISTS }} || \
        curl -L https://github.com/lxgw/LxgwWenKai/releases/download/v{{ WENKAI_VERSION }}/LXGWWenKai-Regular.ttf -o {{ WENKAI_CACHE_FILE }}
    {{ XIHEI_CACHE_EXISTS }} || \
        curl -L https://github.com/lxgw/LxgwNeoXiHei/releases/download/v{{ XIHEI_VERSION }}/LXGWNeoXiHei.ttf -o {{ XIHEI_CACHE_FILE }}
    cp {{ WENKAI_CACHE_FILE }} {{ WENKAI_PUBLIC_FILE }}
    cp {{ XIHEI_CACHE_FILE }} {{ XIHEI_PUBLIC_FILE }}

@font-version:
    echo "wenkai-version={{ WENKAI_VERSION }}"
    echo "xihei-version={{ XIHEI_VERSION }}"

@install:
    bun install --frozen-lockfile

format: install
    biome format
    bun rustywind --check-formatted ./content ./src
    bun rustywind --check-formatted --custom-regex "@apply ([_a-zA\.-Z0-9\s\-:\[\]]+?);" ./src

check: install font
    bunx --bun astro check
    biome check

lint:
    biome lint

fix-all:
    bun rustywind --write ./content ./src
    bun rustywind --write --custom-regex "@apply ([_a-zA\.-Z0-9\s\-:\[\]]+?);" ./src
    biome format --write
    biome check --write
    biome lint --write

dev: install font
    bunx --bun astro dev

build: install font check
    bunx --bun astro build

clean-build: clean && build

preview: install
    bunx --bun astro preview

sync: install
    bunx --bun astro sync

clean:
    rm -rf dist node_modules .astro

cache-clean-font:
    rm -rf {{ FONT_CACHE_DIR }}
