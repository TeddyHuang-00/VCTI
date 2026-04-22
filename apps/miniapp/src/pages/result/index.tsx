import { Button, Canvas, Image, Text, View } from "@tarojs/components";
import Taro, { useShareAppMessage } from "@tarojs/taro";
import {
  calculateAssessmentFromDimensionPosteriors,
  dimensions,
  getUncertaintyRange,
  MAX_REACHABLE_POSTERIOR,
  parseDimensionScoresFromQuery,
  parseResultCodeFromQuery,
} from "@vcti/shared/domain/vcti";
import type { DimensionId } from "@vcti/shared/domain/vcti/types";
import { DIMENSION_COLORS, withAlpha, withSaturation } from "@vcti/shared/lib/colors";
import { useMemo, useState } from "react";
import type { CanvasLike } from "../../lib/renderShareCard";
import { renderShareCard } from "../../lib/renderShareCard";
import "./index.scss";

const CONTAINER_HEIGHT_PX = 16;
const BAR_SOLID_HEIGHT_PX = 10;
const BAR_UNCERTAINTY_HEIGHT_PX = 8;

function toPercent(value: number) {
  return Math.round(value * 100);
}

function buildUncertaintyStyle(leaning: "left" | "right", start: number, end: number) {
  const rawLeft = leaning === "left" ? 50 - end : 50 + start;
  const rawRight = leaning === "left" ? 50 - start : 50 + end;
  const clampedLeft = Math.max(0, Math.min(100, rawLeft));
  const clampedRight = Math.max(0, Math.min(100, rawRight));
  const center = (clampedLeft + clampedRight) / 2;
  const span = Math.max(0, clampedRight - clampedLeft);

  return {
    left: `${center}%`,
    width: `${span}%`,
    transform: "translateX(-50%)",
  };
}

function buildSolidStyle(leaning: "left" | "right", end: number, minWidthPx: number) {
  const radiusPx = minWidthPx / 2;
  return {
    left: leaning === "left" ? `${50 - end}%` : `calc(50% - ${radiusPx}px)`,
    width: `max(calc(${end}% + ${radiusPx}px), ${minWidthPx}px)`,
  };
}

function toneColor(dimensionId: DimensionId, leaning: "left" | "right", purity: number, alpha = 1) {
  const [r, g, b] = withSaturation(DIMENSION_COLORS[dimensionId][leaning], 0.32 + purity * 0.68);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function DimensionBar({
  dimensionId,
  normalized,
  purity,
  leaning,
  variance,
}: {
  dimensionId: DimensionId;
  normalized: number;
  purity: number;
  leaning: "left" | "right";
  variance: number;
}) {
  const position = (Math.abs(normalized) / MAX_REACHABLE_POSTERIOR) * 50;
  const uncertaintyRange = getUncertaintyRange(normalized, variance);
  const uncertaintyStart = uncertaintyRange.start * 50;
  const uncertaintyEnd = uncertaintyRange.end * 50;
  const solidInsetPx = CONTAINER_HEIGHT_PX / 2 - BAR_SOLID_HEIGHT_PX / 2;
  const uncertaintyInsetPx = CONTAINER_HEIGHT_PX / 2 - BAR_UNCERTAINTY_HEIGHT_PX / 2;
  const solidStyle = buildSolidStyle(leaning, position, BAR_SOLID_HEIGHT_PX);
  const uncertaintyStyle = buildUncertaintyStyle(leaning, uncertaintyStart, uncertaintyEnd);

  return (
    <View className="dimension-bar">
      <View className="dimension-bar__track">
        <View className="dimension-bar__midline" />
        <View
          className="dimension-bar__positioner"
          style={{
            left: `${uncertaintyInsetPx}px`,
            right: `${uncertaintyInsetPx}px`,
            height: `${BAR_UNCERTAINTY_HEIGHT_PX}px`,
            marginTop: `-${BAR_UNCERTAINTY_HEIGHT_PX / 2}px`,
            overflow: "hidden",
          }}
        >
          <View
            className="dimension-bar__uncertainty"
            style={{
              ...uncertaintyStyle,
              backgroundColor: toneColor(dimensionId, leaning, purity, 0.26),
            }}
          />
        </View>

        <View
          className="dimension-bar__positioner"
          style={{
            left: `${solidInsetPx}px`,
            right: `${solidInsetPx}px`,
            height: `${BAR_SOLID_HEIGHT_PX}px`,
            marginTop: `-${BAR_SOLID_HEIGHT_PX / 2}px`,
          }}
        >
          <View
            className="dimension-bar__solid"
            style={{
              ...solidStyle,
              backgroundColor: toneColor(dimensionId, leaning, purity),
            }}
          />
        </View>
      </View>
    </View>
  );
}

function ExpandableDetail({
  title,
  summary,
  detailBody,
}: {
  title: string;
  summary: string;
  detailBody: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <View className={`expandable ${open ? "expandable--open" : ""}`}>
      <View className="expandable__header" onClick={() => setOpen(!open)}>
        <Text className="expandable__title">{title}</Text>
        <View className="expandable__arrow">
          <Text className="expandable__arrow-icon">{open ? "▲" : "▼"}</Text>
        </View>
      </View>
      <View className="expandable__body">
        <Text className="expandable__summary">{summary}</Text>
        <Text className="expandable__detail">{detailBody}</Text>
      </View>
    </View>
  );
}

function getImagePath(imageName: string) {
  return `/assets/archetypes/${imageName}`;
}

export default function ResultPage() {
  const [saving, setSaving] = useState(false);
  const [savingCode, setSavingCode] = useState(false);

  const result = useMemo(() => {
    const instance = Taro.getCurrentInstance();
    const params = instance.router?.params ?? {};
    // Taro adds $taroTimestamp to params; filter it out via a URLSearchParams adapter
    const adapter = { get: (key: string) => params[key] ?? null };
    const parsed = parseDimensionScoresFromQuery(adapter as unknown as URLSearchParams);
    if (!parsed) return null;
    return calculateAssessmentFromDimensionPosteriors(
      parsed.posteriors,
      parseResultCodeFromQuery(adapter as unknown as URLSearchParams),
      parsed.variances
    );
  }, []);

  useShareAppMessage(() => {
    if (!result) return { title: "VCTI - Vibe-Coder Type Indicator", path: "/pages/index/index" };
    const params = Taro.getCurrentInstance().router?.params ?? {};
    const queryStr = Object.entries(params)
      .filter(([key]) => key !== "$taroTimestamp")
      .map(([k, v]) => `${k}=${v}`)
      .join("&");
    return {
      title: `我的编程人格是 ${result.profile.code} - ${result.profile.chineseName}`,
      path: `/pages/result/index?${queryStr}`,
    };
  });

  async function getCanvasNode() {
    const query = Taro.createSelectorQuery();
    const nodes = await new Promise<Array<{ node?: CanvasLike }>>((resolve) => {
      query.select("#shareCanvas").fields({ node: true, size: true }).exec(resolve);
    });
    return nodes[0]?.node;
  }

  async function saveToAlbum(filePath: string) {
    const setting = await Taro.getSetting();
    if (!setting.authSetting?.["scope.writePhotosAlbum"]) {
      try {
        await Taro.authorize({ scope: "scope.writePhotosAlbum" });
      } catch {
        const { confirm } = await Taro.showModal({
          title: "需要权限",
          content: "保存图片到相册需要您的授权",
        });
        if (confirm) {
          await Taro.openSetting();
        }
        throw new Error("Permission denied");
      }
    }
    await Taro.saveImageToPhotosAlbum({ filePath });
  }

  async function handleSaveImage() {
    if (!result) return;
    setSaving(true);
    try {
      const canvas = await getCanvasNode();
      if (!canvas) throw new Error("Canvas not available");

      const dpr = Taro.getSystemInfoSync().pixelRatio || 2;
      await renderShareCard(canvas, dpr, {
        result,
        archetypePath: getImagePath(result.profile.imageName),
        miniappCodePath: "/assets/miniapp-qrcode.jpeg",
      });

      const { tempFilePath } = await Taro.canvasToTempFilePath({
        canvas: canvas as never,
        fileType: "png",
      });
      await saveToAlbum(tempFilePath);
      await Taro.showToast({ title: "已保存到相册", icon: "success" });
    } catch (err) {
      console.error("Save image failed:", err);
      await Taro.showToast({ title: "保存失败", icon: "none" });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveMiniAppCode() {
    setSavingCode(true);
    try {
      const fs = Taro.getFileSystemManager();
      const tempPath = `${Taro.env.USER_DATA_PATH}/miniapp-qrcode.jpeg`;

      await new Promise<void>((resolve, reject) => {
        fs.readFile({
          filePath: "/assets/miniapp-qrcode.jpeg",
          success: (res) => {
            fs.writeFile({
              filePath: tempPath,
              data: res.data,
              success: () => resolve(),
              fail: (err) => reject(err),
            });
          },
          fail: (err) => reject(err),
        });
      });

      await saveToAlbum(tempPath);
      await Taro.showToast({ title: "已保存到相册", icon: "success" });
    } catch (err) {
      console.error("Save mini app code failed:", err);
      await Taro.showToast({ title: "保存失败", icon: "none" });
    } finally {
      setSavingCode(false);
    }
  }

  if (!result) {
    return (
      <View className="page-result">
        <View className="empty-state">
          <Text className="empty-state__title">链接已失效</Text>
          <Text className="empty-state__desc">
            这个结果链接不完整，请重新完成测评以生成你的专属结果。
          </Text>
          <Button
            className="empty-state__btn"
            onClick={() => Taro.redirectTo({ url: "/pages/index/index" })}
          >
            返回首页
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View className="page-result">
      <View className="result-header">
        <View className="result-header__info">
          <Text className="result-header__label">你的编码人格</Text>
          <Text className="result-header__hint">保存图片，把你的 VCTI 人格发给同僚。</Text>
        </View>
        <View className="result-header__actions">
          <Button className="btn-save" onClick={handleSaveImage} loading={saving}>
            {saving ? "生成中……" : "保存结果图"}
          </Button>
          <Button className="btn-copy" onClick={handleSaveMiniAppCode} loading={savingCode}>
            {savingCode ? "生成中……" : "保存小程序码"}
          </Button>
          <Button
            className="btn-retake"
            onClick={() => Taro.redirectTo({ url: "/pages/index/index" })}
          >
            再测一次
          </Button>
        </View>
      </View>

      <View className="result-card">
        <View className="profile-section">
          <View className="profile-section__image-wrap">
            <Image
              className="profile-section__image"
              src={getImagePath(result.profile.imageName)}
              mode="aspectFit"
            />
          </View>
          <View className="profile-section__info">
            <View className="profile-section__name">
              <Text className="profile-section__code">{result.profile.code}</Text>
              <Text className="profile-section__chinese-name">{result.profile.chineseName}</Text>
            </View>
            <Text className="profile-section__summary">{result.profile.summary}</Text>
          </View>
          <Text className="profile-section__quote">"{result.profile.quote}"</Text>
        </View>

        <View className="dimensions-section">
          {dimensions.map((dimension) => {
            const score = result.dimensionScores[dimension.id];
            return (
              <View key={dimension.id} className="dimension-card">
                <View className="dimension-card__header">
                  <View className="dimension-card__info">
                    <Text className="dimension-card__label">{dimension.name}</Text>
                    <Text className="dimension-card__value">
                      {score.letter} ·{" "}
                      {score.leaning === "left" ? dimension.leftLabel : dimension.rightLabel}
                    </Text>
                  </View>
                  <View
                    className="dimension-card__badge"
                    style={{
                      backgroundColor: withAlpha(
                        DIMENSION_COLORS[dimension.id][score.leaning],
                        0.16
                      ),
                      color: DIMENSION_COLORS[dimension.id][score.leaning],
                    }}
                  >
                    <Text>{toPercent(score.purity)}%</Text>
                  </View>
                </View>

                <DimensionBar
                  dimensionId={dimension.id}
                  normalized={score.normalized}
                  purity={score.purity}
                  leaning={score.leaning}
                  variance={score.variance}
                />

                <View className="dimension-card__labels">
                  <Text className="dimension-card__label-left">{dimension.leftFullName}</Text>
                  <Text className="dimension-card__label-right">{dimension.rightFullName}</Text>
                </View>

                <ExpandableDetail
                  title={dimension.detailTitle}
                  summary={dimension.summary}
                  detailBody={dimension.detailBody}
                />
              </View>
            );
          })}
        </View>
      </View>

      <View className="result-footer">
        <Button className="btn-save" onClick={handleSaveImage} loading={saving}>
          {saving ? "生成中……" : "保存结果图"}
        </Button>
        <Button className="btn-copy" onClick={handleSaveMiniAppCode} loading={savingCode}>
          {savingCode ? "生成中……" : "保存小程序码"}
        </Button>
      </View>

      {Taro.getEnv() === Taro.ENV_TYPE.WEAPP && (
        <Canvas
          id="shareCanvas"
          type="2d"
          style="width:375px;height:600px;position:fixed;left:-9999px;top:0;pointer-events:none;z-index:-1;"
        />
      )}
    </View>
  );
}
