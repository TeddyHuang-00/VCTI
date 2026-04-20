import { useMemo, useState } from "react";

import ResultSummary from "@/components/ResultSummary";
import {
  calculateAssessmentFromDimensionPosteriors,
  parseDimensionScoresFromQuery,
  parseResultCodeFromQuery,
} from "@/domain/vcti";
import type { ResultCode } from "@/domain/vcti/types";
import { renderShareCardToPng } from "@/lib/share-card-render";

function loadImageAsDataUrl(src: string) {
  return new Promise<string>((resolve, reject) => {
    fetch(src)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load image: ${src}`);
        }

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

function toPngBlobPart(bytes: Uint8Array) {
  const copied = new Uint8Array(bytes.byteLength);
  copied.set(bytes);
  return copied.buffer;
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
  const result = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const searchParams = new URLSearchParams(window.location.search);
    const parsed = parseDimensionScoresFromQuery(searchParams);
    if (!parsed) {
      return null;
    }

    return calculateAssessmentFromDimensionPosteriors(
      parsed,
      initialCode ?? parseResultCodeFromQuery(searchParams)
    );
  }, [initialCode]);

  async function handleSaveImage() {
    if (!result) {
      return;
    }

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
        <div className="p-8 text-center bg-white rounded-[24px] shadow-[rgba(0,0,0,0.06)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_4px_4px]">
          <h1 className="font-light text-black font-display text-[3rem] tracking-[-0.8px]">
            无法解析结果
          </h1>
          <p className="mt-4 leading-7 text-[1rem] tracking-[0.16px] text-[#4e4e4e]">
            当前链接缺少四维分数参数。请返回首页完成问卷后重新生成分享链接。
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
          <div className="text-[12px] tracking-[0.14px] text-[#777169]">VCTI Result</div>
          <p className="mt-2 leading-7 text-[1rem] tracking-[0.16px] text-[#4e4e4e]">
            你的 vibe coder 人格已经生成，保存或转发这张结果页就能直接分享。
          </p>
        </div>
        <div className="flex flex-wrap gap-3 justify-end items-center">
          <button
            type="button"
            onClick={handleSaveImage}
            className="py-3 px-5 font-medium text-black rounded-full ring-1 bg-[rgba(245,242,239,0.8)] text-[0.94rem] shadow-[rgba(78,50,23,0.04)_0px_6px_16px] ring-[rgba(0,0,0,0.06)]"
          >
            {saving ? "正在生成截图" : "保存结果截图"}
          </button>
          <button
            type="button"
            onClick={handleCopyLink}
            className="py-3 px-5 font-medium text-white bg-black rounded-full text-[0.94rem]"
          >
            {copied ? "已复制分享链接" : "复制分享链接"}
          </button>
          <a
            href={basePath}
            className="py-2 px-4 font-medium text-black rounded-full ring-1 bg-[rgba(245,242,239,0.8)] text-[0.94rem] shadow-[rgba(78,50,23,0.04)_0px_6px_16px] ring-[rgba(0,0,0,0.06)]"
          >
            重新测试
          </a>
        </div>
      </div>
      <ResultSummary result={result} basePath={basePath} />
      <div className="flex flex-wrap gap-3 justify-end mt-6">
        <button
          type="button"
          onClick={handleSaveImage}
          className="py-3 px-5 font-medium text-black rounded-full ring-1 bg-[rgba(245,242,239,0.8)] text-[0.94rem] shadow-[rgba(78,50,23,0.04)_0px_6px_16px] ring-[rgba(0,0,0,0.06)]"
        >
          {saving ? "正在生成截图" : "保存结果截图"}
        </button>
        <button
          type="button"
          onClick={handleCopyLink}
          className="py-3 px-5 font-medium text-white bg-black rounded-full text-[0.94rem]"
        >
          {copied ? "已复制分享链接" : "复制分享链接"}
        </button>
      </div>
    </div>
  );
}
