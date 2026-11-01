// Conversão PNG/JPG/GIF -> WEBP 512x512 com transparência,
// compatível com sticker nativo do WhatsApp.
// Usa magick-wasm (suportado em Deno/Supabase Edge Functions — sharp NÃO é suportado).
//
// IMPORTANTE: a Edge Function tem ~2s de CPU por requisição. Converter uma foto
// grande aqui estoura o limite ("CPU Time exceeded" / HTTP 546) e a função é
// encerrada no meio do envio. Por isso o painel já converte a imagem no navegador
// e envia um WEBP 512x512 pronto; esta conversão fica só como reserva para
// arquivos pequenos enviados antes dessa mudança.
import {
  ImageMagick,
  initializeImageMagick,
  MagickFormat,
  MagickColors,
  Gravity,
} from "npm:@imagemagick/magick-wasm@0.0.30";

let magickReady: Promise<void> | null = null;
async function ensureMagick(): Promise<void> {
  if (!magickReady) {
    magickReady = (async () => {
      const wasmRes = await fetch(
        "https://esm.sh/@imagemagick/magick-wasm@0.0.30/dist/magick.wasm",
      );
      if (!wasmRes.ok) {
        throw new Error(`magick-wasm fetch ${wasmRes.status}`);
      }
      const bytes = new Uint8Array(await wasmRes.arrayBuffer());
      await initializeImageMagick(bytes);
    })();
  }
  return magickReady;
}

export function isWebpBytes(bytes: Uint8Array): boolean {
  return (
    bytes.length > 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  );
}

/**
 * Lê largura/altura de um WEBP direto do cabeçalho, sem decodificar a imagem
 * (custo de CPU praticamente zero). Retorna null se o formato não for reconhecido.
 */
export function webpDimensions(b: Uint8Array): { width: number; height: number } | null {
  if (!isWebpBytes(b) || b.length < 30) return null;
  const chunk = String.fromCharCode(b[12], b[13], b[14], b[15]);
  if (chunk === "VP8X") {
    return {
      width: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)),
      height: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)),
    };
  }
  if (chunk === "VP8 ") {
    return {
      width: (b[26] | (b[27] << 8)) & 0x3fff,
      height: (b[28] | (b[29] << 8)) & 0x3fff,
    };
  }
  if (chunk === "VP8L" && b[20] === 0x2f) {
    return {
      width: 1 + (((b[22] & 0x3f) << 8) | b[21]),
      height: 1 + (((b[24] & 0x0f) << 10) | (b[23] << 2) | ((b[22] & 0xc0) >> 6)),
    };
  }
  return null;
}

export type StickerConvertLog = {
  inputSize: number;
  outputSize: number;
  inputDetected: string;
  converted: boolean;
  width: number;
  height: number;
};

function detectInputMime(bytes: Uint8Array): string {
  if (isWebpBytes(bytes)) return "image/webp";
  if (
    bytes.length > 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
  ) return "image/png";
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes.length > 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return "image/gif";
  }
  return "application/octet-stream";
}

/**
 * Converte qualquer imagem suportada (PNG/JPG/GIF/WEBP) para um WEBP 512x512
 * com fundo transparente, preservando proporção (fit: contain).
 */
export async function convertToStickerWebp(
  input: Uint8Array,
): Promise<{ bytes: Uint8Array; log: StickerConvertLog }> {
  const inputMime = detectInputMime(input);

  await ensureMagick();

  return await new Promise((resolve, reject) => {
    try {
      ImageMagick.read(input, (img) => {
        // Garante alpha channel ativo
        try { (img as any).hasAlpha = true; } catch { /* noop */ }

        // Resize mantendo proporção dentro de 512x512
        img.resize(512, 512);
        // Estende canvas para exatamente 512x512 com fundo transparente
        try {
          img.backgroundColor = MagickColors.Transparent;
        } catch { /* noop */ }
        try {
          (img as any).extent?.(512, 512, Gravity.Center, MagickColors.Transparent);
        } catch { /* noop */ }

        img.write(MagickFormat.WebP, (out) => {
          const bytes = new Uint8Array(out);
          resolve({
            bytes,
            log: {
              inputSize: input.length,
              outputSize: bytes.length,
              inputDetected: inputMime,
              converted: true,
              width: 512,
              height: 512,
            },
          });
        });
      });
    } catch (e) {
      reject(e);
    }
  });
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
