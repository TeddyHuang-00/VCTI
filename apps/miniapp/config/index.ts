import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@tarojs/cli";
import { compressAssets } from "./plugins/image-compress";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SHARED_SRC = path.resolve(__dirname, "../../../packages/shared/src");
const MINIAPP_ROOT = path.resolve(__dirname, "..");
const ASSETS_SRC = path.resolve(MINIAPP_ROOT, "src/assets");
const ASSETS_DEST = path.resolve(MINIAPP_ROOT, "dist/assets");

export default defineConfig({
  projectName: "VCTI",
  sourceRoot: "src",
  outputRoot: "dist",
  framework: "react",
  jsMinimizer: "esbuild",
  deviceRatio: {
    // 公式: 750 / 屏幕逻辑宽度 (designWidth 默认为 750)
    // 参考: https://docs.taro.zone/docs/size/
    320: 2.34, // iPhone SE 1st
    360: 2.08, // 小屏 Android (360dp)
    375: 2, // iPhone 6/7/8/SE2/SE3/X/XS/11 Pro
    390: 1.92, // iPhone 12/13/14
    393: 1.91, // iPhone 15/16, Google Pixel
    412: 1.82, // 主流 Android (412dp)
    414: 1.81, // iPhone 6/7/8 Plus, XR, 11, XS Max/11 Pro Max
    428: 1.75, // iPhone 12/13/14 Pro Max, iPhone 14 Plus
    430: 1.74, // iPhone 15/16 Pro Max
    640: 1.17, // 老款 Android
    750: 1, // 标准基准 (iPhone 6/7/8 的 2x 设计稿)
    828: 0.91, // iPhone XR/11 (max-width context)
  },
  compiler: {
    type: "vite",
    vitePlugins: [
      {
        name: "resolve-vcti-shared",
        enforce: "pre",
        config() {
          return {
            resolve: {
              alias: {
                "@vcti/shared": SHARED_SRC,
              },
            },
          };
        },
      },
      {
        name: "silence-sass-deprecation",
        config() {
          return {
            css: {
              preprocessorOptions: {
                scss: {
                  silenceDeprecations: ["legacy-js-api"],
                },
              },
            },
          };
        },
      },
      {
        name: "copy-and-compress-assets",
        apply: "build",
        async closeBundle() {
          // Remove miniprogramRoot from project.config.json — the dist/ directory
          // IS the miniprogram root, and miniprogram-ci's code analysis fails when
          // miniprogramRoot is set to "./" (CodeDataFileHelper can't find app.json).
          const configPath = path.resolve(MINIAPP_ROOT, "dist/project.config.json");
          if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
            delete config.miniprogramRoot;
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
          }
          if (!fs.existsSync(ASSETS_SRC)) return;
          fs.cpSync(ASSETS_SRC, ASSETS_DEST, { recursive: true, force: true });
          await compressAssets(ASSETS_DEST);
        },
      },
    ],
  },
  plugins: ["@tarojs/plugin-platform-weapp", "@tarojs/plugin-platform-h5"],
  h5: {
    devServer: {
      port: 10086,
    },
    postcss: {
      pxtransform: {
        enable: false,
      },
    },
  },
  mini: {
    postcss: {
      pxtransform: {
        enable: true,
      },
    },
  },
});
