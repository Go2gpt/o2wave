import React from "react";
import path from "path";
import { Document, Page, View, Text, Image, StyleSheet, Font } from "@react-pdf/renderer";
import type { PackSemanal, PackDia } from "@/types";

// Noto Sans: cobertura Unicode completa (ñ/á/é, subíndices como ₂, etc.).
// Helvetica (default) no soporta ₂ ni emojis → glyphs rotos.
const FONT_DIR = path.join(process.cwd(), "public", "fonts");
Font.register({
  family: "NotoSans",
  fonts: [
    { src: path.join(FONT_DIR, "NotoSans-Regular.ttf") },
    { src: path.join(FONT_DIR, "NotoSans-Bold.ttf"), fontWeight: "bold" },
  ],
});
// Emojis como imágenes (Twemoji vía CDN): fiable en serverless, evita los
// problemas de Noto Color Emoji en @react-pdf.
Font.registerEmojiSource({ format: "png", url: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/" });
// No partir palabras (mejor para textos cortos en español).
Font.registerHyphenationCallback((word) => [word]);

const NARANJA = "#f9b23b";
const GRIS = "#6b7280";
const AZUL = "#1e40af";

const RED_LABEL: Record<string, string> = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok" };

const s = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 40, paddingHorizontal: 40, fontSize: 11, color: "#111827", fontFamily: "NotoSans" },
  header: { backgroundColor: NARANJA, color: "#ffffff", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, marginBottom: 16 },
  headerTitle: { fontSize: 13, fontWeight: "bold", color: "#ffffff" },
  headerSub: { fontSize: 9, color: "#ffffff", marginTop: 2 },
  imgWrap: { alignItems: "center", marginBottom: 14 },
  img: { width: "70%", borderRadius: 6, objectFit: "cover" },
  placeholder: { width: "70%", height: 180, backgroundColor: "#f3f4f6", borderRadius: 6, alignItems: "center", justifyContent: "center" },
  placeholderTxt: { color: GRIS, fontSize: 10 },
  tema: { fontSize: 13, fontWeight: "bold", marginBottom: 6, color: "#111827" },
  texto: { fontSize: 11, lineHeight: 1.5, color: "#374151", marginBottom: 10 },
  hashtags: { fontSize: 10, color: AZUL, marginTop: 4 },
  seccion: { fontSize: 11, fontWeight: "bold", marginTop: 8, marginBottom: 4, color: "#111827" },
  seg: { marginBottom: 5 },
  segTiempo: { fontWeight: "bold", color: NARANJA, fontSize: 10 },
  segVoz: { color: "#374151", fontSize: 10 },
  segAccion: { color: GRIS, fontSize: 9 },
  plano: { fontSize: 10, color: "#374151", marginBottom: 2 },
  audio: { fontSize: 10, color: "#374151", marginTop: 4 },
  footer: { position: "absolute", bottom: 20, left: 40, right: 40, textAlign: "center", fontSize: 8, color: "#9ca3af" },
});

function fechaLarga(fecha: string): string {
  try {
    return new Date(fecha + "T12:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
  } catch { return fecha; }
}

function DiaPage({ dia, idx }: { dia: PackDia; idx: number }) {
  const esTikTok = dia.tipo === "tiktok";
  const guion = dia.guion_tiktok;
  return (
    <Page size="A4" style={s.page}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Día {idx + 1} — {fechaLarga(dia.fecha)}</Text>
        <Text style={s.headerSub}>{RED_LABEL[dia.tipo] || dia.tipo}{dia.fuente === "fecha_usuario" ? " · Tu fecha" : ""}</Text>
      </View>

      {esTikTok ? (
        <View>
          {dia.titular ? <Text style={s.tema}>{dia.titular}</Text> : <Text style={s.tema}>{dia.tema}</Text>}
          {guion?.guion?.length ? (
            <View>
              <Text style={s.seccion}>Guion</Text>
              {guion.guion.map((seg, i) => (
                <View key={i} style={s.seg}>
                  <Text style={s.segTiempo}>{seg.tiempo}</Text>
                  {!!seg.voz && <Text style={s.segVoz}>“{seg.voz}”</Text>}
                  {!!seg.accion && <Text style={s.segAccion}>🎥 {seg.accion}</Text>}
                </View>
              ))}
            </View>
          ) : <Text style={s.texto}>{dia.texto}</Text>}
          {!!guion?.planos?.length && (
            <View>
              <Text style={s.seccion}>Planos a grabar</Text>
              {guion.planos.map((p) => <Text key={p.numero} style={s.plano}>{p.numero}. {p.descripcion}</Text>)}
            </View>
          )}
          {!!guion?.audio_sugerido && (<><Text style={s.seccion}>Audio sugerido</Text><Text style={s.audio}>{guion.audio_sugerido}</Text></>)}
          {!!(dia.hashtags && dia.hashtags.length) && <Text style={s.hashtags}>{dia.hashtags.join(" ")}</Text>}
        </View>
      ) : (
        <View>
          {dia.imagen_url
            ? <View style={s.imgWrap}><Image style={s.img} src={dia.imagen_url} /></View>
            : <View style={s.imgWrap}><View style={s.placeholder}><Text style={s.placeholderTxt}>Sin imagen — genérala desde la app</Text></View></View>}
          <Text style={s.tema}>{dia.tema}</Text>
          <Text style={s.texto}>{dia.texto}</Text>
          {!!(dia.hashtags && dia.hashtags.length) && <Text style={s.hashtags}>{dia.hashtags.join(" ")}</Text>}
        </View>
      )}

      <Text style={s.footer} fixed>Generado con o2Wave · www.o2wave.app</Text>
    </Page>
  );
}

export function buildPackDocument(pack: PackSemanal) {
  const dias = pack.contenido?.dias || [];
  return (
    <Document title={`Pack semanal ${pack.fecha_inicio}`}>
      {dias.length
        ? dias.map((d, i) => <DiaPage key={i} dia={d} idx={i} />)
        : <Page size="A4" style={s.page}><Text>Este pack no tiene contenido.</Text></Page>}
    </Document>
  );
}
