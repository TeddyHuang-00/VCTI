WEB_ROOT := "apps/web"
MINIAPP_ROOT := "apps/miniapp"
SHARED_ROOT := "packages/shared"

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

ASSETS_SRC := "assets"
WEB_PUBLIC := WEB_ROOT / "public"
MINIAPP_ASSETS := MINIAPP_ROOT / "src" / "assets"

WEB_BUN := "bun run --cwd " + WEB_ROOT + " --bun"
MINIAPP_BUN := "bun run --cwd " + MINIAPP_ROOT + " --bun"

# ---------- shared ----------

[group("util")]
@font:
    mkdir -p {{ FONT_CACHE_DIR }} {{ PUBLIC_FONT_DIR }}
    {{ WENKAI_CACHE_EXISTS }} || \
        curl -L https://github.com/lxgw/LxgwWenKai/releases/download/v{{ WENKAI_VERSION }}/LXGWWenKai-Regular.ttf -o {{ WENKAI_CACHE_FILE }}
    {{ XIHEI_CACHE_EXISTS }} || \
        curl -L https://github.com/lxgw/LxgwNeoXiHei/releases/download/v{{ XIHEI_VERSION }}/LXGWNeoXiHei.ttf -o {{ XIHEI_CACHE_FILE }}
    cp {{ WENKAI_CACHE_FILE }} {{ WENKAI_PUBLIC_FILE }}
    cp {{ XIHEI_CACHE_FILE }} {{ XIHEI_PUBLIC_FILE }}

[group("util")]
@assets:
    mkdir -p {{ WEB_PUBLIC }}/archetypes {{ MINIAPP_ASSETS }}/archetypes
    cp {{ ASSETS_SRC }}/archetypes/*.png {{ WEB_PUBLIC }}/archetypes/
    cp {{ ASSETS_SRC }}/archetypes/*.png {{ MINIAPP_ASSETS }}/archetypes/

[group("util")]
@font-version:
    echo "wenkai-version={{ WENKAI_VERSION }}"
    echo "xihei-version={{ XIHEI_VERSION }}"

[group("util")]
@install:
    bun install --frozen-lockfile

[group("util")]
@clean:
    rm -rf dist node_modules .astro \
      ./{{ WEB_ROOT }}/dist ./{{ WEB_ROOT }}/node_modules ./{{ WEB_ROOT }}/.astro \
      ./{{ MINIAPP_ROOT }}/dist ./{{ MINIAPP_ROOT }}/node_modules

@cache-clean-font:
    rm -rf {{ FONT_CACHE_DIR }}

# ---------- web ----------

[group("web")]
format-web: install
    {{ WEB_BUN }} biome format
    {{ WEB_BUN }} rustywind --check-formatted ./content ./{{ WEB_ROOT }}/src
    {{ WEB_BUN }} rustywind --check-formatted --custom-regex "@apply ([_a-zA\.-Z0-9\s\-:\[\]]+?);" ./{{ WEB_ROOT }}/src

[group("web")]
check-web: install font assets format-web
    {{ WEB_BUN }} astro check
    {{ WEB_BUN }} biome check

[group("web")]
lint-web: install font assets format-web
    {{ WEB_BUN }} biome lint

[group("web")]
dev-web: install font assets
    {{ WEB_BUN }} astro dev

[group("web")]
build-web: install font assets check-web
    {{ WEB_BUN }} astro build

[group("web")]
preview-web: install
    {{ WEB_BUN }} astro preview

[group("web")]
sync-web: install
    {{ WEB_BUN }} astro sync

[group("web")]
fix-web:
    {{ WEB_BUN }} rustywind --write ./content ./{{ WEB_ROOT }}/src
    {{ WEB_BUN }} rustywind --write --custom-regex "@apply ([_a-zA\.-Z0-9\s\-:\[\]]+?);" ./{{ WEB_ROOT }}/src
    {{ WEB_BUN }} biome format --write
    {{ WEB_BUN }} biome check --write
    {{ WEB_BUN }} biome lint --write

# ---------- miniapp ----------

[group("miniapp")]
format-miniapp: install
    {{ MINIAPP_BUN }} biome format

[group("miniapp")]
check-miniapp: install assets
    {{ MINIAPP_BUN }} biome check

[group("miniapp")]
lint-miniapp: install assets
    {{ MINIAPP_BUN }} biome lint

[group("miniapp")]
dev-miniapp: install assets
    {{ MINIAPP_BUN }} taro build --type h5 --watch

[group("miniapp")]
build-miniapp: install assets
    NODE_ENV=production {{ MINIAPP_BUN }} taro build --type weapp

[group("miniapp")]
preview-miniapp: build-miniapp
    {{ MINIAPP_BUN }} preview

[group("miniapp")]
release-miniapp: build-miniapp
    {{ MINIAPP_BUN }} upload

[group("miniapp")]
fix-miniapp:
    {{ MINIAPP_BUN }} biome format --write
    {{ MINIAPP_BUN }} biome check --write
    {{ MINIAPP_BUN }} biome lint --write
