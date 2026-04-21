import { useEffect, useMemo, useState } from "react";

import ResultSummary from "@/components/ResultSummary";
import {
  calculateAssessmentFromDimensionPosteriors,
  parseDimensionScoresFromQuery,
  parseResultCodeFromQuery,
} from "@/domain/vcti";
import type { ResultCode } from "@/domain/vcti/types";
import { preloadShareCardAssets, renderShareCardToPng } from "@/lib/share-card-render";

function loadImageAsDataUrl(src: string) {
  return new Promise<string>((resolve, reject) => {
    fetch(src)
      .then(async (response) => {
        if (!response.ok) throw new Error(`Failed to load image: ${src}`);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error(`Failed to read image: ${src}`));
        reader.readAsDataURL(blob);
      })
      .catch(reject);
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

function toPngBlobPart(bytes: Uint8Array): BlobPart {
  return new Uint8Array(bytes).buffer as ArrayBuffer;
}

function ActionButtons({
  basePath,
  saving,
  copied,
  onSaveImage,
  onCopyLink,
}: {
  basePath: string;
  saving: boolean;
  copied: boolean;
  onSaveImage: () => void;
  onCopyLink: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-3 justify-end items-center">
      <button
        type="button"
        onClick={onSaveImage}
        className="py-3 px-5 font-medium text-black rounded-full ring-1 bg-stone/80 text-[0.94rem] shadow-warm ring-black/5"
      >
        {saving ? "生成中……" : "保存结果图"}
      </button>
      <button
        type="button"
        onClick={onCopyLink}
        className="py-3 px-5 font-medium text-white bg-black rounded-full text-[0.94rem]"
      >
        {copied ? "链接已复制" : "复制分享链接"}
      </button>
      <a
        href={basePath}
        className="py-2 px-4 font-medium text-black rounded-full ring-1 bg-stone/80 text-[0.94rem] shadow-warm ring-black/5"
      >
        再测一次
      </a>
    </div>
  );
}

export default function ResultPageApp({
  basePath = "/",
  initialCode,
  questionnaireQrDataUrl,
}: {
  basePath?: string;
  initialCode?: ResultCode;
  questionnaireQrDataUrl: string;
}) {
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    preloadShareCardAssets(basePath);
  }, [basePath]);

  const result = useMemo(() => {
    if (typeof window === "undefined") return null;
    const searchParams = new URLSearchParams(window.location.search);
    const parsed = parseDimensionScoresFromQuery(searchParams);
    if (!parsed) return null;
    return calculateAssessmentFromDimensionPosteriors(
      parsed,
      initialCode ?? parseResultCodeFromQuery(searchParams)
    );
  }, [initialCode]);

  async function handleSaveImage() {
    if (!result) return;
    setSaving(true);
    try {
      const archetypeDataUrl = await loadImageAsDataUrl(
        `${basePath}archetypes/${result.profile.imageName}`
      );
      const png = await renderShareCardToPng({
        result,
        basePath,
        archetypeDataUrl,
        questionnaireQrDataUrl,
      });
      downloadBlob(
        new Blob([toPngBlobPart(png)], { type: "image/png" }),
        `${result.profile.code.toLowerCase()}-vcti-share-card.png`
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  if (!result) {
    return (
      <div className="px-4 pt-10 pb-16 mx-auto max-w-4xl sm:px-6 lg:px-8">
        <div className="p-8 text-center bg-white rounded-[24px] shadow-card">
          <h1 className="font-light text-black font-display text-[3rem] tracking-[-0.8px]">
            链接已失效
          </h1>
          <p className="mt-4 leading-7 text-[1rem] tracking-[0.16px] text-graphite">
            这个结果链接不完整，请重新完成测评以生成你的专属结果。
          </p>
          <a
            href={basePath}
            className="inline-flex py-3 px-5 mt-6 font-medium text-white bg-black rounded-full text-[0.94rem]"
          >
            返回首页
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-8 pb-12 mx-auto max-w-6xl sm:px-6 lg:px-8 lg:pt-10 lg:pb-20">
      <div className="flex gap-4 justify-between items-center mb-8">
        <div>
          <div className="text-[12px] tracking-[0.14px] text-warmgray">你的编码人格</div>
          <p className="mt-2 leading-7 text-[1rem] tracking-[0.16px] text-graphite">
            保存图片或复制链接，把你的 VCTI 人格发给同僚。
          </p>
        </div>
        <ActionButtons
          basePath={basePath}
          saving={saving}
          copied={copied}
          onSaveImage={handleSaveImage}
          onCopyLink={handleCopyLink}
        />
      </div>
      <ResultSummary result={result} basePath={basePath} />
      <div className="flex flex-wrap gap-3 justify-end mt-6">
        <ActionButtons
          basePath={basePath}
          saving={saving}
          copied={copied}
          onSaveImage={handleSaveImage}
          onCopyLink={handleCopyLink}
        />
      </div>
    </div>
  );
}
