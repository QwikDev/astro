import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getCollection } from "astro:content";
import type { APIRoute, GetStaticPaths } from "astro";
import satori from "satori";
import sharp from "sharp";

export const prerender = true;

// Cache shared assets at module scope so they're loaded once per build
const assetsPromise = (async () => {
  const fontPath = join(
    process.cwd(),
    "src/assets/fonts/unbounded-latin-700-normal.woff"
  );
  const logoPath = join(process.cwd(), "src/assets/qwik-v2-logo.svg");
  const bgPath = join(process.cwd(), "src/assets/og-background.svg");

  const [fontData, logoSvg, bgSvg] = await Promise.all([
    readFile(fontPath),
    readFile(logoPath),
    readFile(bgPath)
  ]);

  const [logoPng, bgPng] = await Promise.all([
    sharp(logoSvg).resize(160, 182).png().toBuffer(),
    sharp(bgSvg).resize(600, 600).png().toBuffer()
  ]);

  return {
    fontData,
    logoBase64: `data:image/png;base64,${logoPng.toString("base64")}`,
    bgBase64: `data:image/png;base64,${bgPng.toString("base64")}`
  };
})();

export const getStaticPaths: GetStaticPaths = async () => {
  const docs = await getCollection("docs");
  return [
    {
      params: { route: "index" },
      props: { title: "Qwik + Astro" }
    },
    ...docs.map((entry) => ({
      params: {
        route: entry.id === "installation" ? "docs" : `docs/${entry.id}`
      },
      props: { title: entry.data.title }
    }))
  ];
};

export const GET: APIRoute = async ({ props }) => {
  const { title } = props as { title: string };
  const { fontData, logoBase64, bgBase64 } = await assetsPromise;

  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          backgroundColor: "#0a0a0a",
          position: "relative",
          fontFamily: "Unbounded"
        },
        children: [
          // Background pattern (top area)
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                backgroundImage: `url(${bgBase64})`,
                backgroundSize: "600px 600px",
                backgroundRepeat: "repeat",
                opacity: 0.8,
                maskImage:
                  "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0) 60%)",
                // biome-ignore lint/style/useNamingConvention: Satori requires WebkitMaskImage
                WebkitMaskImage:
                  "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0) 60%)"
              }
            }
          },
          // Content
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center"
              },
              children: [
                // Logo
                {
                  type: "img",
                  props: {
                    src: logoBase64,
                    width: 160,
                    height: 182,
                    style: { marginBottom: "40px" }
                  }
                },
                // Title
                {
                  type: "div",
                  props: {
                    style: {
                      fontSize: 64,
                      fontWeight: 700,
                      color: "white",
                      textAlign: "center",
                      maxWidth: "900px",
                      lineHeight: 1.2
                    },
                    children: title
                  }
                }
              ]
            }
          }
        ]
      }
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "Unbounded",
          data: fontData,
          style: "normal",
          weight: 700
        }
      ]
    }
  );

  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable"
    }
  });
};
