WEB_ROOT := "apps/web"

CACHE_DIR := ".cache"
FONT_CACHE_DIR := CACHE_DIR / "fonts"
PUBLIC_FONT_DIR := WEB_ROOT / "public" / "fonts"
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

WEB_BUN := "bun run --cwd " + WEB_ROOT + " --bun"

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
    {{ WEB_BUN }} rustywind --check-formatted ./content ./{{ WEB_ROOT }}/src
    {{ WEB_BUN }} rustywind --check-formatted --custom-regex "@apply ([_a-zA\.-Z0-9\s\-:\[\]]+?);" ./{{ WEB_ROOT }}/src

check: install font format
    {{ WEB_BUN }} astro check
    biome check

lint:
    biome lint

fix-all:
    {{ WEB_BUN }} rustywind --write ./content ./{{ WEB_ROOT }}/src
    {{ WEB_BUN }} rustywind --write --custom-regex "@apply ([_a-zA\.-Z0-9\s\-:\[\]]+?);" ./{{ WEB_ROOT }}/src
    biome format --write
    biome check --write
    biome lint --write

dev: install font
    {{ WEB_BUN }} astro dev

build: install font check
    {{ WEB_BUN }} astro build

clean-build: clean && build

preview: install
    {{ WEB_BUN }} astro preview

sync: install
    {{ WEB_BUN }} astro sync

clean:
    rm -rf dist node_modules .astro ./{{ WEB_ROOT }}/dist ./{{ WEB_ROOT }}/node_modules ./{{ WEB_ROOT }}/.astro

cache-clean-font:
    rm -rf {{ FONT_CACHE_DIR }}
