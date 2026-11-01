// Prepara imagens para publicar no Facebook e no Instagram, no navegador.
//
// O Instagram (API de publicação) só aceita JPEG e recusa fotos de feed fora da
// proporção 4:5 (vertical) até 1.91:1 (horizontal). Aqui a imagem vira JPEG e,
// se precisar, ganha bordas brancas até caber na proporção — nada é cortado.
import { loadImage } from "./stickerImage";

const MIN_RATIO = 4 / 5;   // mais vertical aceito
const MAX_RATIO = 1.91;    // mais horizontal aceito
const MAX_WIDTH = 1440;    // largura máxima usada pelo Instagram
const MAX_BYTES = 8 * 1024 * 1024; // limite de imagem do Instagram

const IMAGE_RE = /\.(jpe?g|png|gif|bmp|webp|heic|heif)$/i;
const VIDEO_RE = /\.(mp4|mov|m4v|webm|3gp|mkv|avi)$/i;

export type SocialMediaKind = "image" | "video";

export function socialKindOf(file: File): SocialMediaKind | null {
  if (file.type.startsWith("video/") || VIDEO_RE.test(file.name)) return "video";
  if (file.type.startsWith("image/") || IMAGE_RE.test(file.name)) return "image";
  return null;
}

const isJpeg = (f: File) => f.type === "image/jpeg" || /\.jpe?g$/i.test(f.name);

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

/**
 * Devolve a imagem pronta para Facebook e Instagram (JPEG, proporção aceita).
 * `adjusted` indica se foi preciso converter ou colocar bordas.
 */
export async function toSocialImage(file: File): Promise<{ file: File; adjusted: boolean }> {
  let img;
  try {
    img = await loadImage(file);
  } catch {
    throw new Error(`Não foi possível ler "${file.name}" como imagem (use JPG, PNG ou WEBP).`);
  }

  try {
    const w = img.width, h = img.height;
    if (!w || !h) throw new Error("imagem vazia");
    const ratio = w / h;

    // Já está pronta: JPEG, proporção aceita e tamanho dentro do limite.
    if (isJpeg(file) && ratio >= MIN_RATIO && ratio <= MAX_RATIO && file.size <= MAX_BYTES) {
      return { file, adjusted: false };
    }

    // Área final: amplia a lateral (foto muito alta) ou o topo/base (muito larga).
    let cw = w, ch = h;
    if (ratio < MIN_RATIO) cw = Math.ceil(h * MIN_RATIO);
    else if (ratio > MAX_RATIO) ch = Math.ceil(w / MAX_RATIO);

    const scale = Math.min(1, MAX_WIDTH / cw);
    let outW = Math.max(1, Math.round(cw * scale));
    let outH = Math.max(1, Math.round(ch * scale));
    // Arredondamento não pode jogar a proporção para fora do limite.
    if (outW / outH < MIN_RATIO) outW = Math.ceil(outH * MIN_RATIO);
    if (outW / outH > MAX_RATIO) outH = Math.ceil(outW / MAX_RATIO);

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas indisponível");
    ctx.fillStyle = "#ffffff"; // JPEG não tem transparência: fundo branco
    ctx.fillRect(0, 0, outW, outH);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    const dw = Math.round(w * scale), dh = Math.round(h * scale);
    ctx.drawImage(img.source, Math.round((outW - dw) / 2), Math.round((outH - dh) / 2), dw, dh);

    let blob: Blob | null = null;
    for (const q of [0.92, 0.85, 0.75, 0.6]) {
      blob = await toBlob(canvas, q);
      if (blob && blob.size <= MAX_BYTES) break;
    }
    if (!blob) throw new Error("falha ao gerar JPEG");

    const base = file.name.replace(/\.[^.]+$/, "") || "imagem";
    return { file: new File([blob], `${base}.jpg`, { type: "image/jpeg" }), adjusted: true };
  } catch (e: any) {
    throw new Error(`Não foi possível preparar "${file.name}" para as redes: ${e?.message ?? e}`);
  } finally {
    img.close();
  }
}

/** ID da empresa a partir do nome do arquivo — mesma regra do envio de WhatsApp (1.jpg → 1). */
export const companyIdFromFileName = (name: string) => name.split(".")[0].trim();
