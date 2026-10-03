// Şifreli evrakın "anlamsız karakter" görünümü. Sabit tohumla üretilir:
// her derlemede aynı metin çıkar, sayfa sunucu ve tarayıcıda birebir aynı kalır.

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** `count` satır şifreli görünen metin; satırlar taşmadan kırpılacak kadar uzun üretilir. */
export function cipherLines(count: number, seed: number, length = 32): string[] {
  const random = seededRandom(seed);
  return Array.from({ length: count }, () =>
    Array.from({ length }, () => ALPHABET[Math.floor(random() * ALPHABET.length)]).join(""),
  );
}
