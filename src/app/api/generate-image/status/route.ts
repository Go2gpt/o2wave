import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta el parámetro id" }, { status: 400 });

  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) return NextResponse.json({ error: "REPLICATE_API_TOKEN no configurado" }, { status: 500 });

  try {
    const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ error: "Error consultando estado" }, { status: 500 });

    const data = await res.json();
    return NextResponse.json({
      status: data.status,
      imagenUrl: data.status === "succeeded" && data.output?.[0] ? data.output[0] : null,
    });
  } catch (error) {
    return NextResponse.json({ error: `Error: ${error instanceof Error ? error.message : "desconocido"}` }, { status: 500 });
  }
}
