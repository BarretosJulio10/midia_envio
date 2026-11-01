// Converte uma imagem em figurinha do WhatsApp (WEBP 512x512, fundo transparente)
// direto no navegador, antes do upload.
//
// Motivo: converter no servidor (Edge Function) estoura o limite de CPU com fotos
// grandes ("CPU Time exceeded" / HTTP 546) e a mensagem fica presa em "enviando".
// Aqui a conversão é instantânea e o arquivo enviado cai de vários MB para ~30 KB.

const SIZE = 512;
// Figurinha estática do WhatsApp deve ficar abaixo de 100 KB.
const MAX_STICKER_BYTES = 95 * 1024;

export async function loadImage(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file);
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
    } catch {
      // cai no fallback com <img>
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("formato de imagem não suportado pelo navegador"));
      el.src = url;
    });
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Retorna um novo File WEBP 512x512 pronto para ser enviado como figurinha.
 * A imagem é centralizada mantendo a proporção, com sobra transparente.
 * GIF animado vira figurinha estática (primeiro quadro).
 * Se o navegador não gerar WEBP, devolve PNG 512x512 (o servidor converte esse
 * arquivo pequeno sem estourar a CPU).
 */
export async function toStickerFile(file: File): Promise<File> {
  let img;
  try {
    img = await loadImage(file);
  } catch {
    throw new Error(`Não foi possível ler "${file.name}" como imagem para figurinha (use PNG, JPG, WEBP ou GIF).`);
  }

  try {
    if (!img.width || !img.height) throw new Error("imagem vazia");

    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas indisponível");

    const scale = Math.min(SIZE / img.width, SIZE / img.height);
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img.source, Math.round((SIZE - w) / 2), Math.round((SIZE - h) / 2), w, h);

    const base = file.name.replace(/\.[^.]+$/, "") || "figurinha";

    let blob: Blob | null = null;
    for (const quality of [0.9, 0.75, 0.6, 0.45]) {
      blob = await canvasToBlob(canvas, "image/webp", quality);
      if (!blob || blob.type !== "image/webp") { blob = null; break; } // navegador sem WEBP
      if (blob.size <= MAX_STICKER_BYTES) break;
    }
    if (blob) return new File([blob], `${base}.webp`, { type: "image/webp" });

    const png = await canvasToBlob(canvas, "image/png");
    if (!png) throw new Error("falha ao gerar imagem");
    return new File([png], `${base}.png`, { type: "image/png" });
  } catch (e: any) {
    throw new Error(`Não foi possível converter "${file.name}" em figurinha: ${e?.message ?? e}`);
  } finally {
    img.close();
  }
}
