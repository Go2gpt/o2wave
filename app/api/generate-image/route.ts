import { NextRequest, NextResponse } from "next/server";
import { FormData } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const { formData }: { formData: FormData } = await request.json();

    const { nombreOrganizacion, tipoOrganizacion, redSocial, formatoInstagram, tema } =
      formData;

    const aspectRatioMap: Record<string, string> = {
      "Post 1080×1080": "1:1",
      "Story 9:16": "9:16",
      Facebook: "16:9",
    };

    const aspectRatio =
      redSocial === "Instagram" && formatoInstagram
        ? aspectRatioMap[formatoInstagram]
        : redSocial === "Facebook"
        ? "16:9"
        : "1:1";

    const orgType = tipoOrganizacion === "ONG" ? "organización sin ánimo de lucro" : "empresa PYME";

    const imagePrompt = `Professional social media image for ${redSocial} from a ${orgType} called "${nombreOrganizacion}" about "${tema}". Modern design, vibrant colors, high quality photography or illustration, clean composition, no text overlays, no words, no letters, no numbers in the image. Inspirational and authentic visual style, warm lighting, professional feel.`;

    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: "REPLICATE_API_TOKEN no configurado" },
        { status: 500 }
      );
    }

    // Start prediction
    const startRes = await fetch("https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "wait",
      },
      body: JSON.stringify({
        input: {
          prompt: imagePrompt,
          aspect_ratio: aspectRatio,
          output_format: "webp",
          output_quality: 90,
          num_outputs: 1,
        },
      }),
    });

    if (!startRes.ok) {
      const err = await startRes.text();
      console.error("Replicate error:", err);
      return NextResponse.json(
        { error: "Error al iniciar la generación de imagen" },
        { status: 500 }
      );
    }

    const prediction = await startRes.json();

    // If already succeeded (sync)
    if (prediction.status === "succeeded" && prediction.output?.length > 0) {
      return NextResponse.json({ imagenUrl: prediction.output[0] });
    }

    // Poll for result
    const predictionId = prediction.id;
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      await new Promise((r) => setTimeout(r, 2000));
      attempts++;

      const pollRes = await fetch(
        `https://api.replicate.com/v1/predictions/${predictionId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!pollRes.ok) continue;

      const pollData = await pollRes.json();

      if (pollData.status === "succeeded" && pollData.output?.length > 0) {
        return NextResponse.json({ imagenUrl: pollData.output[0] });
      }

      if (pollData.status === "failed" || pollData.status === "canceled") {
        return NextResponse.json(
          { error: "La generación de imagen falló" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: "Tiempo de espera agotado para la imagen" },
      { status: 504 }
    );
  } catch (error) {
    console.error("Error generating image:", error);
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      { error: `Error generando la imagen: ${message}` },
      { status: 500 }
    );
  }
}
