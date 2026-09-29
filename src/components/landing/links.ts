export const APP_URL = "https://app.armaganai.com";
export const LOGIN_URL = `${APP_URL}/login`;
export const CONTACT_EMAIL = "info@armaganai.com";
export const EXTENSION_URL =
  "https://chromewebstore.google.com/detail/ooikhkboigafkcgjphknepjjmjgfphfd";

// Davet formu gelene kadar talepler e-postayla alınıyor.
export const INVITE_URL =
  `mailto:${CONTACT_EMAIL}` +
  `?subject=${encodeURIComponent("ArmağanAI davet talebi")}` +
  `&body=${encodeURIComponent(
    "Merhaba,\n\nBüromuz için ArmağanAI davetli betasına katılmak istiyoruz.\n\nAd soyad:\nBüro adı:\nŞehir / baro:\nTelefon:\n",
  )}`;
