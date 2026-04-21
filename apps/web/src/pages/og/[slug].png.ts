import { personalityProfiles } from "@vcti/shared/domain/vcti";
import type { APIRoute } from "astro";
import { renderOgPng } from "@/lib/og-render";

const ogEntries = [
  {
    slug: "vcti",
    code: "VCTI",
    label: "Vibe-Coder Type Indicator",
  },
  ...Object.values(personalityProfiles).map((profile) => ({
    slug: profile.code.toLowerCase(),
    code: profile.code === "LEGEND" ? "LGND" : profile.code,
    label: profile.chineseName,
  })),
];

export function getStaticPaths() {
  return ogEntries.map((entry) => ({
    params: { slug: entry.slug },
    props: entry,
  }));
}

export const GET: APIRoute = async ({ props }) => {
  const entry = props as (typeof ogEntries)[number];
  const png = await renderOgPng(entry.code, entry.label);
  const body = new Uint8Array(png.byteLength);
  body.set(png);

  return new Response(body, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};
