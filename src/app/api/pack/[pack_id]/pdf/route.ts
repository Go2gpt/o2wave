import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { accederPack, errorStatus } from "@/lib/packAuth";
import { buildPackDocument } from "@/lib/PackPdf";

export const maxDuration = 30;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: { pack_id: string } }) {
  try {
    const { pack } = await accederPack(params.pack_id);
    const buffer = await renderToBuffer(buildPackDocument(pack));
    const filename = `pack-semanal-${pack.fecha_inicio}.pdf`;
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const { status, message } = errorStatus(e);
    return NextResponse.json({ error: message }, { status });
  }
}
