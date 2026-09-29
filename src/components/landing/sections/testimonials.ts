// Büro yorumları. `placeholder: true` olanlar geçici metinlerdir: yalnızca geliştirme
// ortamında "örnek" etiketiyle görünür, production build'e hiç girmez.
// Gerçek yorumlar gelince metni, kişiyi ve büroyu yazıp `placeholder` alanını kaldırın.

export interface Testimonial {
  quote: string;
  name: string;
  role: string;
  placeholder?: boolean;
}

export const testimonials: Testimonial[] = [
  {
    quote:
      "Sabah ilk iş UETS'ye bakmak yerine Armağan'ın açtığı kayıtları kontrol ediyoruz. Kesin süreler takvimde, görev sahibinde.",
    name: "Av. —",
    role: "Büro sahibi, İstanbul",
    placeholder: true,
  },
  {
    quote:
      "İcra dosyalarında ödeme emri ve satış ilanı sürelerini artık elle hesaplamıyoruz. İnceleme gereken belgeyi de açıkça söylüyor.",
    name: "Av. —",
    role: "Avukat, Ankara",
    placeholder: true,
  },
  {
    quote:
      "Stajyerlerimize görevleri Armağan dağıtıyor; hangi dosyada ne yapıldığını raporlardan görüyorum.",
    name: "Av. —",
    role: "Yönetici avukat, İzmir",
    placeholder: true,
  },
];
