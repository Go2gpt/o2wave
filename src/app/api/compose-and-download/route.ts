import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { composeImage } from "@/lib/composeImage";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { imageUrl, headline, positionX, positionY, fontSize, aspectRatio, textAlign, padVertical } = await request.json();
    if (!imageUrl) return NextResponse.json({ error: "Falta imageUrl" }, { status: 400 });

    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return NextResponse.json({ error: "No se pudo descargar la imagen" }, { status: 400 });
    const baseBuffer = Buffer.from(await imgRes.arrayBuffer());

    const finalBuffer = await composeImage({
      imageBuffer: baseBuffer,
      headline: headline ?? null,
      positionX: typeof positionX === "number" ? positionX : 50,
      positionY: typeof positionY === "number" ? positionY : 85,
      fontSize: typeof fontSize === "number" ? fontSize : 52,
      aspectRatio: aspectRatio || "1:1",
      textAlign: textAlign === "left" || textAlign === "right" ? textAlign : "center",
      padVertical: padVertical === true,
    });

    return new NextResponse(new Uint8Array(finalBuffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="o2wave-${Date.now()}.png"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("compose-and-download error:", error);
    return NextResponse.json({ error: `Error: ${error instanceof Error ? error.message : "desconocido"}` }, { status: 500 });
  }
}
