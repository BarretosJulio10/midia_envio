// Universal media-type detector for WhatsApp drivers.
// Decides between image / video / audio / document / sticker based on
// filename extension, with an optional explicit hint (e.g. user marked
// the upload as a sticker).

export type MediaType = 'image' | 'video' | 'audio' | 'document' | 'sticker';

const IMAGE = new Set(['jpg', 'jpeg', 'png', 'gif', 'bmp', 'heic', 'heif']);
const VIDEO = new Set(['mp4', 'mov', 'webm', 'm4v', '3gp', 'mkv', 'avi']);
const AUDIO = new Set(['mp3', 'm4a', 'wav', 'ogg', 'oga', 'aac', 'opus', 'amr', 'flac']);

export function extOf(filename: string | null | undefined): string {
  if (!filename) return '';
  const clean = filename.split('?')[0].split('#')[0];
  const dot = clean.lastIndexOf('.');
  if (dot < 0) return '';
  return clean.slice(dot + 1).toLowerCase();
}

export function detectMediaType(
  filename: string | null | undefined,
  hint?: string | null,
): MediaType {
  const h = (hint || '').toLowerCase().trim();
  if (h === 'sticker') return 'sticker';
  if (h === 'image' || h === 'video' || h === 'audio' || h === 'document') {
    return h as MediaType;
  }

  const ext = extOf(filename);
  if (ext === 'webp') {
    // .webp pode ser figurinha OU imagem; sem hint, tratamos como imagem.
    return 'image';
  }
  if (IMAGE.has(ext)) return 'image';
  if (VIDEO.has(ext)) return 'video';
  if (AUDIO.has(ext)) return 'audio';
  return 'document';
}
