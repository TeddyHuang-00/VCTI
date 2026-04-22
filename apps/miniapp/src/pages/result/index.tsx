import { Button, Canvas, Image, Text, View } from "@tarojs/components";
import Taro, { useShareAppMessage } from "@tarojs/taro";
import {
  calculateAssessmentFromDimensionPosteriors,
  dimensions,
  MAX_REACHABLE_POSTERIOR,
  parseDimensionScoresFromQuery,
  parseResultCodeFromQuery,
} from "@vcti/shared/domain/vcti";
import type { AssessmentResult, DimensionId } from "@vcti/shared/domain/vcti/types";
import { DIMENSION_COLORS, withAlpha, withSaturation } from "@vcti/shared/lib/colors";
import { useMemo, useState } from "react";
import { renderShareCard } from "../../lib/renderShareCard";
import "./index.scss";

const CONTAINER_HEIGHT_PX = 16;
const BAR_SOLID_HEIGHT_PX = 10;
const BAR_UNCERTAINTY_HEIGHT_PX = 8;

// Inset from container edge so each bar's endpoint circle center aligns with
// the container's endpoint circle center at maximum extent.
// Solid bar:    container r=8, bar r=5 → inset = 8 - 5 = 3px
// Uncertainty:  container r=8, bar r=4 → inset = 8 - 4 = 4px
const BAR_SOLID_TRACK_INSET_PX = CONTAINER_HEIGHT_PX / 2 - BAR_SOLID_HEIGHT_PX / 2;
const BAR_UNCERTAINTY_TRACK_INSET_PX = CONTAINER_HEIGHT_PX / 2 - BAR_UNCERTAINTY_HEIGHT_PX / 2;

function toPercent(value: number) {
  return Math.round(value * 100);
}

function getUncertaintyRange(posterior: number, variance: number) {
  const purity = Math.abs(posterior) / MAX_REACHABLE_POSTERIOR;
  // Bayesian posterior SD given estimated observation variance from the sample.
  // Consistent answers → low variance → narrow uncertainty.
  // Mixed answers → high variance → wide uncertainty.
  const n = 5;
  const obsVarFloor = 0.1;
  const obsVar = Math.max(variance, obsVarFloor);
  const posteriorVar = 1 / (1 + n / obsVar);
  const posteriorSD = Math.sqrt(posteriorVar);
  const spread = posteriorSD / MAX_REACHABLE_POSTERIOR;
  return {
    start: purity - spread,
    end: purity + spread,
  };
}

function buildBarStyle(leaning: "left" | "right", start: number, span: number, radiusPx: number) {
  if (leaning === "left") {
    return {
      left: `${50 - start - span}%`,
      width: `calc(${span}% + ${radiusPx}px)`,
    };
  }
  return {
    left: `calc(${50 + start}% - ${radiusPx}px)`,
    width: `calc(${span}% + ${radiusPx}px)`,
  };
}

function toneColor(dimensionId: DimensionId, leaning: "left" | "right", purity: number, alpha = 1) {
  const [r, g, b] = withSaturation(DIMENSION_COLORS[dimensionId][leaning], 0.32 + purity * 0.68);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function DimensionBar({
  dimensionId,
  posterior,
  purity,
  leaning,
  variance,
}: {
  dimensionId: DimensionId;
  posterior: number;
  purity: number;
  leaning: "left" | "right";
  variance: number;
}) {
  const position = (Math.abs(posterior) / MAX_REACHABLE_POSTERIOR) * 50;
  const uncertaintyRange = getUncertaintyRange(posterior, variance);
  const uncertaintyStart = uncertaintyRange.start * 50;
  const uncertaintyEnd = uncertaintyRange.end * 50;

  // When the bar would be narrower than its height, draw a centered circle instead.
  const solidPx = position * 2; // position is in % of half-track, 2*position ≈ px when track~=200px
  const isCircle = position < BAR_SOLID_HEIGHT_PX / 2;
  const solidStyle = isCircle
    ? {
        left: `calc(50% - ${BAR_SOLID_HEIGHT_PX / 2}px)`,
        width: `${BAR_SOLID_HEIGHT_PX}px`,
      }
    : buildBarStyle(leaning, 0, position, BAR_SOLID_HEIGHT_PX / 2);

  const uncertaintyStyle = buildBarStyle(
    leaning,
    uncertaintyStart,
    uncertaintyEnd - uncertaintyStart,
    BAR_UNCERTAINTY_HEIGHT_PX / 2
  );

  return (
    <View className="dimension-bar">
      <View className="dimension-bar__track">
        {/* Uncertainty bar track */}
        <View
          className="dimension-bar__uncertainty-track"
          style={{
            left: `${BAR_UNCERTAINTY_TRACK_INSET_PX}px`,
            right: `${BAR_UNCERTAINTY_TRACK_INSET_PX}px`,
          }}
        >
          <View
            className="dimension-bar__uncertainty"
            style={{
              ...uncertaintyStyle,
              height: `${BAR_UNCERTAINTY_HEIGHT_PX}px`,
              backgroundColor: toneColor(dimensionId, leaning, purity, 0.26),
            }}
          />
        </View>

        {/* Solid bar track */}
        <View
          className="dimension-bar__solid-track"
          style={{
            left: `${BAR_SOLID_TRACK_INSET_PX}px`,
            right: `${BAR_SOLID_TRACK_INSET_PX}px`,
          }}
        >
          <View className="dimension-bar__midline" />
          <View
            className="dimension-bar__solid"
            style={{
              ...solidStyle,
              height: `${BAR_SOLID_HEIGHT_PX}px`,
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
    const nodes = await new Promise<any[]>((resolve) => {
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

      const { tempFilePath } = await Taro.canvasToTempFilePath({ canvas, fileType: "png" });
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
                  posterior={score.posterior}
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

      {process.env.TARO_ENV === "weapp" && (
        <Canvas
          id="shareCanvas"
          type="2d"
          style="width:375px;height:600px;position:fixed;left:-9999px;top:0;pointer-events:none;z-index:-1;"
        />
      )}
    </View>
  );
}
