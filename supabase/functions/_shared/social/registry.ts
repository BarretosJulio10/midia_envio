import type { SocialDriver, SocialPlatform } from "./types.ts";
import { FacebookDriver } from "./facebook.ts";
import { InstagramDriver } from "./instagram.ts";

export function getSocialDriver(platform: SocialPlatform): SocialDriver {
  switch (platform) {
    case 'facebook': return new FacebookDriver();
    case 'instagram': return new InstagramDriver();
    default: throw new Error(`Plataforma social desconhecida: ${platform}`);
  }
}

export * from "./types.ts";
