// Landing ekran görüntüleri için demo büro verisi.
// Tüm kişiler, dosyalar ve tebligatlar kurgusaldır; tarihler çekim gününe göre üretilir.
// scene: hero'daki tebligatın durumu — "processing" (AI işliyor) | "done" (AI analiz tamam).

const { udfDocument } = require("./udf.cjs");

function createDemo({ scene = "done" } = {}) {
const SCENE = scene;

const DAY = 864e5;
const today = new Date();
today.setHours(0, 0, 0, 0);
const at = (days, h = 9, m = 0) => {
  const d = new Date(today.getTime() + days * DAY);
  d.setHours(h, m, 0, 0);
  return d;
};
const iso = (d) => d.toISOString();

// Tebliğ ve son gün: iş gününe denk gelen, hafta sonuna düşmeyen tarihler.
// n iş günü öncesi (hafta sonları sayılmaz), verilen saatte.
const businessBack = (n, h = 9, m = 0) => {
  let d = at(0, h, m);
  let left = n;
  while (left > 0) {
    d = new Date(d.getTime() - DAY);
    if (d.getDay() !== 0 && d.getDay() !== 6) left -= 1;
  }
  return d;
};
const served = businessBack(1, 10, 42);
const plusDays = (d, n) => new Date(d.getTime() + n * DAY);

const FIRM_ID = "firm-demo";
const user = {
  id: "u-deniz",
  email: "deniz@yildizhukuk.av.tr",
  phone: "5320000000",
  phoneCountryCode: "TR",
  firstName: "Deniz",
  lastName: "Yıldız",
  avatar: null,
  firmId: FIRM_ID,
  isPhoneVerified: true,
  isEmailVerified: true,
  createdAt: iso(at(-240)),
  updatedAt: iso(at(-1)),
};

const people = [
  ["m-deniz", "u-deniz", "Deniz", "Yıldız", "OWNER", "deniz@yildizhukuk.av.tr"],
  ["m-selin", "u-selin", "Selin", "Kaya", "ASSOCIATE", "selin@yildizhukuk.av.tr"],
  ["m-mert", "u-mert", "Mert", "Aydın", "LEGAL_INTERN", "mert@yildizhukuk.av.tr"],
  ["m-ayse", "u-ayse", "Ayşe", "Demir", "LEGAL_CLERK", "ayse@yildizhukuk.av.tr"],
  ["m-emre", "u-emre", "Emre", "Şahin", "LEGAL_SECRETARY", "emre@yildizhukuk.av.tr"],
];
const members = people.map(([id, userId, firstName, lastName, role, email]) => ({
  id,
  userId,
  role,
  joinedAt: iso(at(-200)),
  barAssociation: role === "OWNER" || role === "ASSOCIATE" ? "Ankara Barosu" : null,
  registrationNumber: role === "OWNER" ? "41287" : role === "ASSOCIATE" ? "52930" : null,
  hasEncryptedFirmKey: true,
  firmKeyVersion: 1,
  firmKeyUpdatedAt: iso(at(-200)),
  receivesUetsEmails: role === "OWNER" || role === "ASSOCIATE",
  user: { id: userId, email, firstName, lastName, avatar: null },
}));
const syncedBy = { id: "m-deniz", user: { firstName: "Deniz", lastName: "Yıldız" } };

const cases = {
  c318: { id: "c-318", subject: "Alacak", fileNumber: "318", fileYear: 2025, courtName: "Ankara 7. Asliye Hukuk Mahkemesi", caseCategory: "CIVIL" },
  c10482: { id: "c-10482", subject: "İlamsız Takip", fileNumber: "10482", fileYear: 2026, courtName: "İstanbul 14. İcra Dairesi", caseCategory: "ENFORCEMENT" },
  c77: { id: "c-77", subject: "İşçilik Alacağı", fileNumber: "77", fileYear: 2025, courtName: "Bakırköy 2. İş Mahkemesi", caseCategory: "CIVIL" },
  c5521: { id: "c-5521", subject: "Kambiyo Senetlerine Dayalı Takip", fileNumber: "5521", fileYear: 2026, courtName: "İzmir 9. İcra Dairesi", caseCategory: "ENFORCEMENT" },
  c1127: { id: "c-1127", subject: "Ayıplı Mal", fileNumber: "1127", fileYear: 2025, courtName: "İzmir 3. Tüketici Mahkemesi", caseCategory: "CIVIL" },
  c611: { id: "c-611", subject: "Dolandırıcılık", fileNumber: "611", fileYear: 2026, courtName: "İstanbul Anadolu 12. Asliye Ceza Mahkemesi", caseCategory: "CRIMINAL" },
};

const doc = (id, title, name = "belge.pdf", extra = {}) => ({
  id,
  title,
  file: { fileName: name, mimeType: "application/pdf", fileSize: 180000 + id.length * 7000, storageKey: `demo/${id}` },
  source: "UETS",
  status: "PROCESSED",
  aiReviewReason: null,
  ...extra,
});

let seq = 0;
function notice(o) {
  seq += 1;
  const c = o.case;
  return {
    id: o.id,
    firmId: FIRM_ID,
    externalId: `UETS-${9000 + seq}`,
    subject: o.subject,
    senderName: c.courtName,
    recipientName: "Av. Deniz Yıldız",
    uetsStatus: "OKUNDU",
    belgeNo: o.belgeNo,
    inserttime: o.servedAt.getTime(),
    parsedEsasNo: `${c.fileYear}/${c.fileNumber}`,
    parsedCourtName: c.courtName,
    caseId: c.id,
    case: c,
    source: o.source || "UETS",
    status: "AUTO_MATCHED",
    syncedBy,
    documents: o.documents,
    syncedAt: iso(o.syncedAt || at(0, 9, 12)),
    createdAt: iso(o.syncedAt || at(0, 9, 12)),
    updatedAt: iso(at(0, 9, 14)),
    aiProcessingStatus: o.ai || "COMPLETED",
    aiProcessedAt: o.ai === "PROCESSING" ? null : iso(at(0, 9, 14)),
    aiReviewReason: o.review || null,
    aiErrorCode: null,
    aiRetryCount: 0,
    tasks: o.tasks || [],
    calendarEvents: o.events || [],
  };
}

const courtRef = (c) => `${c.courtName} ${c.fileYear}/${c.fileNumber} E.`;
const istinafDue = plusDays(served, 14);
const odemeServed = businessBack(2, 14, 5);
const odemeDue = plusDays(odemeServed, 7);
odemeDue.setHours(9, 0, 0, 0);
const hearingDay = at(23, 10, 30);

const heroDone = SCENE !== "processing";
const notices = [
  notice({
    id: "n-318",
    case: cases.c318,
    subject: "Gerekçeli Karar",
    belgeNo: "20261K7Q3F",
    servedAt: served,
    syncedAt: at(0, 9, 12),
    ai: heroDone ? "COMPLETED" : "PROCESSING",
    documents: [doc("d-318", "Gerekçeli Karar", "gerekceli_karar.pdf")],
    events: heroDone
      ? [{ id: "e-318", title: `${courtRef(cases.c318)} - Görev Son Günü (Kesin Süre)`, eventType: "DEADLINE", status: "SCHEDULED", startAt: iso(new Date(istinafDue.setHours(9, 0))), endAt: null }]
      : [],
    tasks: heroDone
      ? [{ id: "t-318", title: `${courtRef(cases.c318)} - Görev Son Günü (Kesin Süre)`, taskType: "DEADLINE", status: "TODO", dueAt: iso(istinafDue) }]
      : [],
  }),
  notice({
    id: "n-10482",
    case: cases.c10482,
    subject: "Ödeme Emri",
    belgeNo: "20261K5M8T",
    servedAt: odemeServed,
    syncedAt: at(-1, 16, 40),
    documents: [doc("d-10482", "Ödeme Emri (Örnek 7)", "odeme_emri.pdf")],
    events: [{ id: "e-10482", title: `${courtRef(cases.c10482)} - Görev Son Günü (Kesin Süre)`, eventType: "DEADLINE", status: "SCHEDULED", startAt: iso(odemeDue), endAt: null }],
    tasks: [{ id: "t-10482", title: `${courtRef(cases.c10482)} - Görev Son Günü (Kesin Süre)`, taskType: "DEADLINE", status: "IN_PROGRESS", dueAt: iso(odemeDue) }],
  }),
  notice({
    id: "n-77",
    case: cases.c77,
    subject: "Tensip Zaptı",
    belgeNo: "20261J9D2A",
    servedAt: businessBack(3, 11, 20),
    syncedAt: at(-2, 11, 5),
    documents: [doc("d-77", "Tensip Zaptı", "tensip_zapti.pdf")],
    events: [{ id: "e-77", title: `🗓️ ${courtRef(cases.c77)} - Duruşma`, eventType: "HEARING", status: "SCHEDULED", startAt: iso(hearingDay), endAt: null }],
    tasks: [{ id: "t-77", title: "Gider Avansı Tamamlama", taskType: "DEADLINE", status: "TODO", dueAt: iso(plusDays(businessBack(3, 9), 14)) }],
  }),
  notice({
    id: "n-5521",
    case: cases.c5521,
    subject: "Bilirkişi (Kıymet Takdiri) Raporu",
    belgeNo: "20261J4R7C",
    servedAt: businessBack(4, 16, 48),
    syncedAt: at(-3, 14, 22),
    ai: "NEEDS_REVIEW",
    review: "possible_appraisal_wrong_route",
    documents: [doc("d-5521", "Bilirkişi Raporu", "bilirkisi_raporu.pdf", { aiReviewReason: "possible_appraisal_wrong_route" })],
  }),
  notice({
    id: "n-1127",
    case: cases.c1127,
    source: "KEP",
    subject: "Bilirkişi Raporu",
    belgeNo: "20261H8K1P",
    servedAt: businessBack(5, 9, 35),
    syncedAt: at(-4, 10, 2),
    documents: [doc("d-1127", "Bilirkişi Raporu", "bilirkisi_raporu_tuketici.pdf", { source: "KEP" })],
    events: [{ id: "e-1127", title: `${courtRef(cases.c1127)} - Görev Son Günü (Kesin Süre)`, eventType: "DEADLINE", status: "SCHEDULED", startAt: iso(plusDays(businessBack(5, 9), 14)), endAt: null }],
    tasks: [{ id: "t-1127", title: `${courtRef(cases.c1127)} - Görev Son Günü (Kesin Süre)`, taskType: "DEADLINE", status: "TODO", dueAt: iso(plusDays(businessBack(5, 9), 14)) }],
  }),
  notice({
    id: "n-611",
    case: cases.c611,
    subject: "İddianame",
    belgeNo: "20261H2F6Z",
    servedAt: businessBack(7, 13, 10),
    syncedAt: at(-6, 9, 30),
    documents: [doc("d-611", "İddianame", "iddianame.pdf")],
    events: [{ id: "e-611", title: `🗓️ ${courtRef(cases.c611)} - Duruşma`, eventType: "HEARING", status: "SCHEDULED", startAt: iso(at(41, 11, 0)), endAt: null }],
  }),
];

// ---------- Takvim ----------
const creator = { id: "u-deniz", firstName: "Deniz", lastName: "Yıldız", avatar: null };
const caseInfo = (c) =>
  c ? { caseId: c.id, caseName: c.subject, caseFileNumber: c.fileNumber, caseFileYear: c.fileYear, courtName: c.courtName, caseIsOpen: true } : {};
cases.c904 = { id: "c-904", subject: "Tazminat", fileNumber: "904", fileYear: 2025, courtName: "Ankara 12. Asliye Ticaret Mahkemesi", caseCategory: "CIVIL" };
const calItem = (id, o) => ({
  id,
  sourceId: id,
  isAllDay: false,
  status: "SCHEDULED",
  source: "MANUAL",
  noticeSource: null,
  createdBy: creator,
  attendees: [],
  ...caseInfo(o.case),
  ...o,
  case: undefined,
  startAt: iso(o.startAt),
  endAt: o.endAt ? iso(o.endAt) : undefined,
});
const noticeEvent = (n) => {
  const e = n.calendarEvents[0];
  return calItem(e.id, {
    title: e.title,
    eventType: e.eventType,
    startAt: new Date(e.startAt),
    isAllDay: e.eventType === "DEADLINE",
    source: "UETS",
    noticeSource: n.source,
    createdBy: null,
    case: Object.values(cases).find((c) => c.id === n.caseId),
    taskId: null,
  });
};
const calendarItems = [
  calItem("ci-904", { title: `${courtRef(cases.c904)} - Duruşma`, eventType: "HEARING", startAt: at(0, 10, 30), endAt: at(0, 11, 0), source: "UYAP", createdBy: null, case: cases.c904, location: "Ankara Adliyesi · B Blok 3. Kat · Salon 12" }),
  calItem("ci-kaya", { title: "Kaya Tekstil — kira sözleşmesi toplantısı", eventType: "MEETING", startAt: at(0, 14, 0), endAt: at(0, 15, 0), source: "CHAT_AI", clientName: "Kaya Tekstil A.Ş." }),
  calItem("ci-er", { title: "Müvekkil görüşmesi — Ahmet Er", eventType: "APPOINTMENT", startAt: at(0, 16, 30), endAt: at(0, 17, 0), clientName: "Ahmet Er" }),
  calItem("ci-takip", { title: "Bilirkişi ücretinin yatırıldığını kontrol et", eventType: "FOLLOW_UP", startAt: at(0, 9, 0), isAllDay: true, source: "UETS", noticeSource: "UETS", createdBy: null, case: cases.c1127 }),
  calItem("ci-icra", { title: "İzmir 9. İcra Dairesi 2026/5521 E. - Haciz", eventType: "EXECUTION_TRACKING", startAt: at(1, 11, 0), case: cases.c5521 }),
  calItem("ci-selin", { title: "Ön inceleme hazırlığı — ekip toplantısı", eventType: "MEETING", startAt: at(2, 10, 0), endAt: at(2, 11, 0) }),
  ...notices.filter((n) => n.calendarEvents.length).map(noticeEvent),
  // İstinaf son gününün olduğu hafta: dolu bir takvim.
  ...(() => {
    const mon = new Date(istinafDue);
    mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
    const d = (n, h, m = 0) => { const x = new Date(mon); x.setDate(x.getDate() + n); x.setHours(h, m, 0, 0); return x; };
    return [
      calItem("w-1", { title: `${courtRef(cases.c611)} - Duruşma`, eventType: "HEARING", startAt: d(1, 10, 0), endAt: d(1, 11, 0), source: "UYAP", createdBy: null, case: cases.c611, location: "Kartal Adliyesi" }),
      calItem("w-2", { title: "Aydın İnşaat — ihtarname taslağı görüşmesi", eventType: "MEETING", startAt: d(0, 14, 0), endAt: d(0, 15, 0), clientName: "Aydın İnşaat Ltd. Şti." }),
      calItem("w-3", { title: "Bilirkişi raporuna itirazın sunulduğunu kontrol et", eventType: "FOLLOW_UP", startAt: d(2, 9, 0), isAllDay: true, source: "UETS", noticeSource: "UETS", createdBy: null, case: cases.c1127 }),
      calItem("w-4", { title: "İzmir 9. İcra Dairesi 2026/5521 E. - Satış", eventType: "EXECUTION_TRACKING", startAt: d(3, 11, 0), endAt: d(3, 12, 0), case: cases.c5521 }),
      calItem("w-5", { title: "Müvekkil görüşmesi — Zeynep Arslan", eventType: "APPOINTMENT", startAt: d(3, 16, 0), endAt: d(3, 16, 45), clientName: "Zeynep Arslan" }),
      calItem("w-6", { title: `${courtRef(cases.c904)} - Duruşma`, eventType: "HEARING", startAt: d(4, 13, 30), endAt: d(4, 14, 0), source: "UYAP", createdBy: null, case: cases.c904 }),
      calItem("w-7", { title: "Haftalık büro toplantısı", eventType: "MEETING", startAt: d(4, 9, 30), endAt: d(4, 10, 30) }),
    ];
  })(),
];

// ---------- Görevler ----------
// İstinaf son gününün olduğu haftanın Pazartesi'sinden k gün sonra.
const deadlineWeek = (k, h = 17) => {
  const d = new Date(istinafDue);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + k);
  d.setHours(h, 0, 0, 0);
  return d;
};
const assignee = (memberId) => {
  const m = members.find((x) => x.id === memberId);
  return { id: `as-${memberId}`, firmMemberId: m.id, assignedAt: iso(at(-1)), firmMember: { id: m.id, role: m.role, user: { id: m.user.id, firstName: m.user.firstName, lastName: m.user.lastName, avatar: null } } };
};
let order = 0;
const task = (id, o) => {
  const c = o.case;
  order += 1;
  return {
    id,
    firmId: FIRM_ID,
    title: o.title,
    description: o.description ?? null,
    status: o.status ?? "TODO",
    priority: o.priority ?? "MEDIUM",
    taskType: o.taskType ?? "OTHER",
    sortOrder: order,
    dueAt: o.dueAt ? iso(o.dueAt) : null,
    isAllDay: o.isAllDay ?? true,
    caseId: c?.id ?? null,
    clientId: null,
    noticeId: o.noticeId ?? null,
    notice: o.noticeId ? { source: "UETS" } : null,
    source: o.source ?? "MANUAL",
    createdById: "u-deniz",
    isDeadlineCritical: o.critical ?? false,
    uyapOrderNumbers: [],
    parentTaskId: null,
    requiresApproval: false,
    createdAt: iso(at(-1, 9, 14)),
    updatedAt: iso(at(0, 9, 14)),
    case: c ? { id: c.id, subject: c.subject, courtName: c.courtName, fileYear: c.fileYear, fileNumber: c.fileNumber, caseCategory: c.caseCategory, isOpen: true } : undefined,
    createdBy: o.source && o.source !== "MANUAL" ? undefined : creator,
    subTasks: [],
    assignees: (o.to ?? []).map(assignee),
    attachments: [],
    approval: null,
    calendarEvent: o.event ?? null,
  };
};
const tasks = [
  task("t-318", { title: `${courtRef(cases.c318)} - Görev Son Günü (Kesin Süre)`, description: "İstinaf Başvurusu — İstinaf süresi, tebliğden itibaren 2 hafta olup kesindir (HMK m.345).", taskType: "DEADLINE", priority: "URGENT", dueAt: istinafDue, case: cases.c318, source: "UETS", noticeId: "n-318", critical: true, to: ["m-deniz"] }),
  task("t-10482", { title: `${courtRef(cases.c10482)} - Görev Son Günü (Kesin Süre)`, description: "Ödeme emrine itiraz — tebliğden itibaren 7 gün (İİK m.62).", taskType: "DEADLINE", priority: "URGENT", status: "IN_PROGRESS", dueAt: odemeDue, case: cases.c10482, source: "UETS", noticeId: "n-10482", critical: true, to: ["m-selin"] }),
  task("t-77", { title: "Gider Avansı Tamamlama", taskType: "DEADLINE", priority: "HIGH", dueAt: plusDays(businessBack(3, 9), 14), case: cases.c77, source: "UETS", noticeId: "n-77", critical: true, to: ["m-ayse"] }),
  task("t-kaya", { title: "Kaya Tekstil kira sözleşmesi taslağını gözden geçir", taskType: "OTHER", priority: "MEDIUM", status: "IN_PROGRESS", dueAt: at(1), source: "CHAT_AI", to: ["m-selin"] }),
  task("t-dilekce", { title: "Beyan dilekçesi için müvekkilden belge iste", taskType: "FOLLOW_UP", priority: "MEDIUM", dueAt: at(2), case: cases.c1127, to: ["m-mert"] }),
  task("t-durusma", { title: "Duruşma gününü müvekkile bildir", taskType: "OTHER", priority: "LOW", status: "DONE", dueAt: at(-1), case: cases.c77, to: ["m-emre"] }),
  task("t-vekalet", { title: "Vekâletname aslını dosyaya ekle", taskType: "OTHER", priority: "LOW", dueAt: at(3), case: cases.c904, to: ["m-ayse"] }),
  // İstinaf son gününün olduğu hafta (Pazartesi + k gün): kişi görünümünde herkesin işi olsun.
  task("t-istinaf-taslak", { title: "İstinaf dilekçesi taslağını müvekkille paylaş", taskType: "FOLLOW_UP", priority: "HIGH", status: "IN_PROGRESS", dueAt: plusDays(istinafDue, -4), case: cases.c318, to: ["m-mert"] }),
  task("t-muvekkil-bilgi", { title: "Duruşma gününü müvekkile hatırlat", taskType: "FOLLOW_UP", priority: "MEDIUM", dueAt: deadlineWeek(0, 11), case: cases.c611, to: ["m-mert"] }),
  task("t-1127-itiraz", { title: `${courtRef(cases.c1127)} - Rapora itiraz dilekçesi`, taskType: "DEADLINE", priority: "HIGH", dueAt: deadlineWeek(1), case: cases.c1127, to: ["m-selin"] }),
  task("t-sozlesme-rev", { title: "Kaya Tekstil sözleşme revizyonlarını işle", taskType: "OTHER", priority: "MEDIUM", status: "IN_PROGRESS", dueAt: deadlineWeek(4), to: ["m-selin"] }),
  task("t-tanik", { title: "Tanık listesini güncelle", taskType: "OTHER", priority: "MEDIUM", dueAt: deadlineWeek(2), case: cases.c77, to: ["m-ayse"] }),
  task("t-mazbata", { title: "Tebligat mazbatalarını kontrol et", taskType: "FOLLOW_UP", priority: "LOW", dueAt: deadlineWeek(4), case: cases.c318, to: ["m-ayse"] }),
  task("t-masraf", { title: "Bilirkişi ücreti makbuzunu dosyaya ekle", taskType: "CLIENT_EXPENSE_REFUND", priority: "LOW", status: "DONE", dueAt: deadlineWeek(1), case: cases.c1127, to: ["m-emre"] }),
  task("t-evrak-tara", { title: "Müvekkilden gelen evrakı tara ve yükle", taskType: "OTHER", priority: "LOW", dueAt: deadlineWeek(2), case: cases.c904, to: ["m-emre"] }),
  task("t-durusma-hazirlik", { title: "Ceza duruşması için savunma notları", taskType: "HEARING", priority: "HIGH", dueAt: deadlineWeek(3), case: cases.c611, to: ["m-deniz"] }),
];
// Görev kartı karesi: atanan, alt görevler, yorumlar, evrak ve sıralı onay (Selin onayladı, sıra Deniz'de).
const prevWorkday = (d, n) => {
  const x = new Date(d);
  for (let left = n; left > 0; ) {
    x.setDate(x.getDate() - 1);
    if (x.getDay() !== 0 && x.getDay() !== 6) left -= 1;
  }
  return x;
};
const istinafDraftDue = prevWorkday(istinafDue, 2);
istinafDraftDue.setHours(17, 0, 0, 0);
const approver = (id, level, status) => {
  const m = members.find((x) => x.id === id);
  return { id: `aps-${level}`, level, status, approverFirmMemberId: id, approver: { id, user: { id: m.user.id, firstName: m.user.firstName, lastName: m.user.lastName } } };
};
tasks.push({
  ...task("t-istinaf-dilekce", {
    title: "İstinaf dilekçesini hazırla",
    description: "Gerekçeli karardaki bilirkişi hesabına ve eksik incelemeye karşı istinaf dilekçesi. Kesin süre: tebliğden itibaren 2 hafta (HMK m.345).",
    taskType: "DEADLINE",
    priority: "HIGH",
    status: "IN_REVIEW",
    dueAt: istinafDraftDue,
    isAllDay: false,
    case: cases.c318,
    to: ["m-mert"],
  }),
  requiresApproval: true,
  customApprovalChain: [],
  calendarEvent: { id: "e-318", title: `${courtRef(cases.c318)} - Görev Son Günü (Kesin Süre)`, startAt: iso(istinafDue), eventType: "DEADLINE", status: "SCHEDULED" },
  subTasks: [
    { id: "t-istinaf-alt-1", title: "Bilirkişi hesabındaki eksik aşamaları listele", status: "DONE", taskType: "OTHER", dueAt: null, sourceCommentId: "c-istinaf-1" },
    { id: "t-istinaf-alt-2", title: "Müvekkilden hakediş yazışmalarını al", status: "DONE", taskType: "FOLLOW_UP", dueAt: null, sourceCommentId: null },
  ],
  attachments: [{ id: "a-istinaf-1", fileName: "istinaf_dilekcesi_taslak.udf", fileSize: 48210, mimeType: "application/octet-stream", createdAt: iso(at(-1, 16, 20)) }],
  approval: {
    id: "ap-istinaf",
    status: "PENDING",
    requestedById: "u-mert",
    requestedAt: iso(at(-1, 16, 25)),
    requestedBy: { firstName: "Mert", lastName: "Aydın" },
    reviewedBy: null,
    steps: [approver("m-selin", 1, "APPROVED"), approver("m-deniz", 2, "PENDING")],
  },
});
// Görev, istinaf son günü kaydına bağlı (Bağlı Görevler satırında görünür). Tebligat henüz
// işlenirken ("processing" sahnesi) bu kayıt yoktur.
const deadlineRecord = calendarItems.find((i) => i.id === "e-318");
if (deadlineRecord) deadlineRecord.taskId = "t-istinaf-dilekce";
const author = (userId) => {
  const m = members.find((x) => x.user.id === userId);
  return { id: userId, firstName: m.user.firstName, lastName: m.user.lastName, avatar: null };
};
const taskComments = {
  "t-istinaf-dilekce": [
    { id: "c-istinaf-1", content: "Bilirkişi hesabında iki proje aşamasının bedeli hiç alınmamış; ayrıntıları alt göreve yazdım.", createdAt: iso(at(-2, 11, 5)), updatedAt: iso(at(-2, 11, 5)), author: author("u-mert"), attachments: [] },
    { id: "c-istinaf-2", content: "Taslak ekte, onayınıza sundum.", createdAt: iso(at(-1, 16, 25)), updatedAt: iso(at(-1, 16, 25)), author: author("u-mert"), attachments: [] },
    { id: "c-istinaf-3", content: "Faiz başlangıcını ihtar tarihine göre düzelttim, onayladım.", createdAt: iso(at(-1, 18, 40)), updatedAt: iso(at(-1, 18, 40)), author: author("u-selin"), attachments: [] },
  ],
};

const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function weekly(offset = 0) {
  const start = at(-((today.getDay() + 6) % 7) + offset * 7);
  const columns = {};
  for (let i = 0; i < 7; i++) columns[dayKey(new Date(start.getTime() + i * DAY))] = [];
  for (const t of tasks) {
    const k = t.dueAt && dayKey(new Date(t.dueAt));
    if (k && columns[k]) columns[k].push(t);
  }
  return { columns, total: tasks.length, weekStart: iso(start), weekEnd: iso(new Date(start.getTime() + 7 * DAY - 1)) };
}
function kanban() {
  const columns = { TODO: [], IN_PROGRESS: [], IN_REVIEW: [], DONE: [] };
  for (const t of tasks) columns[t.status].push(t);
  return { columns, total: tasks.length };
}

// ---------- Takvim kaydı detayı (API'nin ürettiği metin biçimiyle) ----------
const LEGAL_DISCLAIMER =
  "Bu bildirim ve buna bağlı olarak oluşturulan takvim kayıtları, belge içeriğinin yapay zekâ tarafından otomatik olarak değerlendirilmesi sonucunda üretilmiştir. Belgenin hukuki niteliği, müvekkil bakımından sonucu, kanun yolu veya başvuru hakkının bulunup bulunmadığı, süre hesapları, son gün tarihleri ve oluşturulan görev ya da takvim kayıtları hata içerebilir. İçerikte yer alan hiçbir tespit, hesaplama veya yönlendirme bakımından doğruluk, eksiksizlik ya da güncellik garantisi verilmemektedir. Bu bildirim veya takvim kayıtları esas alınarak yapılan ya da yapılmayan işlemlerden ve bunların sonuçlarından doğabilecek herhangi bir zarar veya hak kaybından sistem sağlayıcısı sorumlu değildir. Tüm hukuki değerlendirmeler ve işlem kararları kullanıcı tarafından bağımsız olarak doğrulanmalıdır.";
const record = (title, desc, legal) =>
  [title.toLocaleUpperCase("tr-TR"), desc, `⚖️ ${legal}`].join("\n\n") + "\n\n" + "─".repeat(38) + "\n\n" + LEGAL_DISCLAIMER;
const eventDescriptions = {
  "e-318": record(
    "İstinaf Başvurusu",
    "Mahkeme davayı müvekkil aleyhine sonuçlandırdı; gerekçeli karara karşı istinaf yoluna başvurulabilir.",
    "İstinaf süresi, tebliğden itibaren 2 hafta olup kesindir (HMK m.345).",
  ),
  "e-10482": record(
    "Ödeme Emrine İtiraz",
    "İlamsız genel haciz yoluyla takip (Örnek 7). Borca, imzaya veya yetkiye itiraz edilebilir.",
    "İtiraz süresi, ödeme emrinin tebliğinden itibaren 7 gündür (İİK m.62).",
  ),
  "e-1127": record(
    "Bilirkişi Raporuna İtiraz",
    "Rapor, ayıp oranını davacı lehine değerlendiriyor; eksik incelenen hususlar için itiraz ve ek rapor talebi değerlendirilmeli.",
    "Bilirkişi raporuna itiraz süresi, tebliğden itibaren 2 haftadır (HMK m.281).",
  ),
};
const eventExtras = {
  "ci-kaya": {
    description: "Kira sözleşmesinin yenilenmesi: artış oranı, depozito ve tahliye taahhüdü maddeleri görüşülecek.",
    location: "Büro · Toplantı odası",
    attendees: ["m-deniz", "m-selin"],
    attachments: [{ id: "a-kaya-1", fileName: "kira_sozlesmesi_taslak_v2.pdf", fileSize: 512000, mimeType: "application/pdf", createdAt: iso(at(0, 9, 8)) }],
  },
};
const eventNotes = {
  "ci-kaya": [
    { id: "note-3", calendarEventId: "ci-kaya", content: "Taslağın ikinci hâli müvekkile gönderildi; toplantıda son hâli konuşulacak.", createdAt: iso(at(0, 9, 10)), editedAt: null, author: author("u-deniz"), attachments: [] },
    { id: "note-2", calendarEventId: "ci-kaya", content: "Depozito maddesi için müvekkilin önerisi taslağa işlendi.", createdAt: iso(at(-1, 18, 5)), editedAt: null, author: author("u-selin"), attachments: [] },
    { id: "note-1", calendarEventId: "ci-kaya", content: "Kira artış maddesi için müvekkilden son iki yılın fatura dökümü istendi.", createdAt: iso(at(-1, 17, 40)), editedAt: iso(at(-1, 17, 52)), author: author("u-selin"), attachments: [] },
  ],
};

function eventDetail(id) {
  const n = notices.find((x) => x.calendarEvents.some((e) => e.id === id));
  const item = calendarItems.find((i) => i.id === id);
  if (!item) return null;
  const c = Object.values(cases).find((x) => x.id === (n?.caseId ?? item.caseId));
  const t = tasks.find((x) => x.id === item.taskId);
  return {
    id,
    firmId: FIRM_ID,
    caseId: c?.id,
    documentId: n?.documents?.[0]?.id,
    title: item.title,
    description: eventDescriptions[id] ?? eventExtras[id]?.description ?? item.description ?? "",
    eventType: item.eventType,
    status: "SCHEDULED",
    startAt: item.startAt,
    endAt: item.endAt,
    isAllDay: item.isAllDay,
    location: eventExtras[id]?.location ?? item.location,
    color: item.eventType === "DEADLINE" ? "#d50000" : undefined,
    noticeId: n?.id ?? null,
    notice: n ? { source: n.source } : null,
    source: item.source,
    isDeleted: false,
    createdAt: iso(at(0, 9, 14)),
    updatedAt: iso(at(0, 9, 14)),
    case: c ? { id: c.id, subject: c.subject, fileYear: c.fileYear, fileNumber: c.fileNumber, courtName: c.courtName } : undefined,
    document: n ? { id: n.documents[0].id, title: n.documents[0].title, fileName: n.documents[0].file.fileName } : undefined,
    createdBy: item.createdBy ?? null,
    attendees: (eventExtras[id]?.attendees ?? []).map((mid, i) => {
      const m = members.find((x) => x.id === mid);
      return { id: `ea-${id}-${i}`, notes: null, firmMember: { id: m.id, user: { firstName: m.user.firstName, lastName: m.user.lastName } } };
    }),
    taskId: t?.id ?? null,
    task: t ? { id: t.id, title: t.title, status: t.status, dueAt: t.dueAt, isDeleted: false } : null,
    attachments: eventExtras[id]?.attachments ?? [],
    hearingId: null,
  };
}

// ---------- Bildirimler (API'deki gerçek başlık/gövde kalıplarıyla) ----------
const notifications = [
  {
    id: "nt-1",
    userId: "u-deniz",
    firmId: FIRM_ID,
    type: "TASK_ASSIGNMENT",
    title: "Tebligattan yeni görev atandı",
    body: `"${courtRef(cases.c318)} - Görev Son Günü (Kesin Süre)" görevi size atandı.`,
    taskId: "t-318",
    noticeId: "n-318",
    isRead: false,
    createdAt: iso(at(0, 9, 14)),
  },
  {
    id: "nt-2",
    userId: "u-deniz",
    firmId: FIRM_ID,
    type: "NEEDS_REVIEW",
    title: "İnceleme Gerekli — UETS Belgesi",
    body: "İzmir 9. İcra Dairesi 2026/5521 E. — Bu bir kıymet takdiri raporu olabilir; itiraz süresi İİK m.128/a uyarınca 7 gün olabilir. Belgeyi kontrol edin.",
    noticeId: "n-5521",
    isRead: false,
    createdAt: iso(at(0, 9, 13)),
  },
  {
    id: "nt-3",
    userId: "u-deniz",
    firmId: FIRM_ID,
    type: "EVENT_REMINDER",
    title: `Duruşma: ${courtRef(cases.c904)} - Duruşma`,
    body: `Bugün 10:30 - Ankara Adliyesi · B Blok 3. Kat · Salon 12 | ${cases.c904.subject}`,
    calendarEventId: "ci-904",
    isRead: false,
    createdAt: iso(at(0, 8, 30)),
  },
  {
    id: "nt-4",
    userId: "u-deniz",
    firmId: FIRM_ID,
    type: "EVENT_REMINDER",
    title: `Kesin Süreli İşler: ${courtRef(cases.c10482)} - Görev Son Günü (Kesin Süre)`,
    body: `Son gün yaklaşıyor | ${cases.c10482.subject}`,
    calendarEventId: "e-10482",
    isRead: true,
    createdAt: iso(at(-1, 9, 0)),
  },
];
const uetsSyncStatus = {
  firmId: FIRM_ID,
  lastRunId: "run-demo",
  status: "SUCCESS",
  completedAt: iso(at(0, 9, 12)),
  counts: { delivered: 6, failed: 0, deferred: 0, skippedFiles: 0 },
  failedNotices: [],
};

// ---------- Asistan sohbetleri (REST'ten yüklenen geçmiş konuşmalar) ----------
// Kart kimlikleri ^[a-z0-9]{20,}$ kalıbında olmalı (tıklanabilirlik). Sohbette üye arama aracı
// yoktur (ekip listesi modele doğrudan verilir); atanan kişi yalnız yanıt metninde geçer.
const trDay = (d, opts) => new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", ...opts }).format(d);
const weekdayOf = (offsetFromMonday, h = 9, m = 0) => at(-((today.getDay() + 6) % 7) + offsetFromMonday, h, m);
const thursday = weekdayOf(3, 11, 0);
const friday = weekdayOf(4, 17, 0);
const saturday = weekdayOf(5, 10, 0);
const nextFriday = weekdayOf(11, 17, 0);
const nextWednesday = weekdayOf(9, 10, 30);
const longDay = (d) => trDay(d, { day: "numeric", month: "long", weekday: "long" });
const msgBase = { routedTaskId: null, inputTokens: null, outputTokens: null, totalTokens: null, costUsd: null, finishReason: null, errorCode: null };
const userMsg = (id, content, t) => ({ ...msgBase, id, role: "USER", content, status: "COMPLETE", model: null, toolCallsJson: null, createdAt: iso(t), updatedAt: iso(t) });
const aiMsg = (id, content, tools, t) => ({ ...msgBase, id, role: "ASSISTANT", content, status: "COMPLETE", model: "gemini-3.8-flash", finishReason: "STOP", toolCallsJson: tools, createdAt: iso(t), updatedAt: iso(t) });
const call = (id, name, summary, entities, extra = {}) => ({ id, name, state: "done", summary, ...(entities ? { entities } : {}), ...extra });

// Kaya Tekstil A.Ş.: sohbet örneklerindeki müvekkil ve dosyaları
const kaya = { kind: "client", id: "cmg0client0kayatekstil01", displayName: "Kaya Tekstil A.Ş.", type: "LEGAL", activeCaseCount: 4, isOurClient: true };
const kayaCase = (id, fileNumber, fileYear, courtName, subject, caseCategory = "CIVIL", nextHearingAt = null) => ({
  kind: "case", id, subject, fileNumber, fileYear, courtName, caseCategory, isOpen: true, nextHearingAt: nextHearingAt && iso(nextHearingAt),
});
const kayaCases = [
  kayaCase("cmg0case0kaya0alacak0145", "145", 2026, "İstanbul 12. Asliye Ticaret Mahkemesi", "Alacak", "CIVIL", nextWednesday),
  kayaCase("cmg0case0kaya0iscilik0088", "88", 2026, "İstanbul Anadolu 4. İş Mahkemesi", "İşçilik Alacağı"),
  kayaCase("cmg0case0kaya0kambiyo1312", "1312", 2025, "İstanbul 7. İcra Dairesi", null, "ENFORCEMENT"),
  kayaCase("cmg0case0kaya0itiraz00051", "51", 2026, "Bakırköy 3. Asliye Ticaret Mahkemesi", "İtirazın İptali"),
];

const CONV = "cmg0conv0haftalikprogram01";
const CONV_CLIENT = "cmg0conv0kayatekstildosya2";
const CONV_TASK = "cmg0conv0gorevtakvimbagla3";
const CONV_CHECK = "cmg0conv0topluatamaonay04";
const chatCase904 = "cmg0case0ankara0tazminat01";
const chatCase77 = "cmg0case0bakirkoy0iscilik1";

const conversations = {
  // Haftanın duruşmaları ve toplantısı
  [CONV]: {
    title: "Bu haftanın programı",
    pinned: true,
    at: at(0, 8, 41),
    messages: [
      userMsg("cmg0msg000000000000000001", "Bu hafta hangi duruşmalarım var?", at(0, 8, 41)),
      aiMsg(
        "cmg0msg000000000000000002",
        `Bu hafta **2 duruşmanız** var:\n\n| Gün | Dosya | Mahkeme |\n|---|---|---|\n| Bugün 10:30 | 2025/904 — Tazminat | Ankara 12. Asliye Ticaret |\n| ${trDay(thursday, { weekday: "long" })} 11:00 | 2025/77 — İşçilik Alacağı | Bakırköy 2. İş |\n\nAyrıca bugün 14:00'te **Kaya Tekstil** ile toplantınız var.`,
        [
          call("tc_0201", "hearing_list", "", [
            { kind: "hearing", id: "cmg0hear0ankara0tazminat1", scheduledAt: iso(at(0, 10, 30)), status: "SCHEDULED", hearingNumber: 2, caseId: chatCase904, caseCategory: "CIVIL", caseFileNumber: "2025/904" },
            { kind: "hearing", id: "cmg0hear0bakirkoy0iscilik", scheduledAt: iso(thursday), status: "SCHEDULED", hearingNumber: 1, caseId: chatCase77, caseCategory: "CIVIL", caseFileNumber: "2025/77" },
          ]),
          call("tc_0202", "calendar_list", "1 adet", [
            { kind: "calendar_event", id: "cmg0evt0kayatekstil000001", title: "Kaya Tekstil — kira sözleşmesi toplantısı", eventType: "MEETING", status: "SCHEDULED", startAt: iso(at(0, 14, 0)), endAt: iso(at(0, 15, 0)), caseId: null, clientId: kaya.id },
          ]),
        ],
        at(0, 8, 41),
      ),
      userMsg("cmg0msg000000000000000003", `${trDay(saturday, { day: "numeric", month: "long" })} 10:00'a adliyede bilirkişiyle görüşme ekle.`, at(0, 8, 44)),
      aiMsg(
        "cmg0msg000000000000000004",
        `Kayıt **oluşturulmadı**: ${trDay(saturday, { day: "numeric", month: "long" })} **Cumartesi** gününe denk geliyor; adliye hafta sonu kapalı olabilir.\n\nGörüşmeyi hafta içi bir güne alayım mı, yoksa yine de bu tarihe mi kaydedeyim?`,
        [call("tc_0401", "calendar_create", "", null, { outcome: "blocked" })],
        at(0, 8, 44),
      ),
    ],
  },
  // Müvekkilin açık dosyalarını getirme
  [CONV_CLIENT]: {
    title: "Kaya Tekstil dosyaları",
    at: at(0, 9, 5),
    messages: [
      userMsg("cmg0msg000000000000000101", "Kaya Tekstil'in açık dosyalarını getir", at(0, 9, 5)),
      aiMsg(
        "cmg0msg000000000000000102",
        `**Kaya Tekstil A.Ş.**'nin 4 açık dosyası var:\n\n- **2026/145** İstanbul 12. Asliye Ticaret — Alacak; duruşma ${longDay(nextWednesday)} 10:30\n- **2026/88** İstanbul Anadolu 4. İş — İşçilik alacağı\n- **2025/1312** İstanbul 7. İcra Dairesi — kambiyo takibi\n- **2026/51** Bakırköy 3. Asliye Ticaret — İtirazın iptali`,
        [call("tc_1001", "client_lookup", "1 adet", [kaya]), call("tc_1002", "case_list", "4 adet", kayaCases)],
        at(0, 9, 5),
      ),
    ],
  },
  // Görev açma, takvime ekleme ve ikisini bağlama (tek istekte)
  [CONV_TASK]: {
    title: "Bilirkişi itirazı görevi",
    at: at(0, 9, 12),
    messages: [
      userMsg(
        "cmg0msg000000000000000201",
        "2026/145 için bilirkişi raporuna itiraz dilekçesi görevini Selin'e ata, son gün gelecek cuma. Takvime de ekle, birbirine bağla.",
        at(0, 9, 12),
      ),
      aiMsg(
        "cmg0msg000000000000000202",
        `Tamam:\n\n- **Görev:** Bilirkişi raporuna itiraz dilekçesi — son gün **${longDay(nextFriday)} 17:00**, Av. Selin Kaya'ya atandı.\n- **Takvim:** aynı gün 17:00'ye kayıt eklendi.\n\nİkisi de **2026/145** dosyasına bağlı ve birbirine bağlandı.`,
        [
          call("tc_2001", "case_list", "1 adet", [kayaCases[0]]),
          call("tc_2002", "task_create", "Bilirkişi raporuna itiraz dilekçesi", [
            { kind: "task", id: "cmg0task0bilirkisiitiraz1", title: "Bilirkişi raporuna itiraz dilekçesi", status: "TODO", priority: "HIGH", taskType: "DEADLINE", dueAt: iso(nextFriday), caseId: kayaCases[0].id, clientId: null },
          ]),
          call("tc_2003", "calendar_create", "Bilirkişi raporuna itiraz — son gün", [
            { kind: "calendar_event", id: "cmg0evt0bilirkisiitiraz01", title: "Bilirkişi raporuna itiraz — son gün", eventType: "DEADLINE", status: "SCHEDULED", startAt: iso(nextFriday), endAt: iso(new Date(nextFriday.getTime() + 36e5)), caseId: kayaCases[0].id, clientId: null },
          ]),
          call("tc_2004", "task_update", "Bilirkişi raporuna itiraz dilekçesi"),
        ],
        at(0, 9, 12),
      ),
    ],
  },
  // Toplu atamadan önce onay
  [CONV_CHECK]: {
    title: "Kaya Tekstil sorumlu avukat",
    at: at(0, 9, 20),
    messages: [
      userMsg("cmg0msg000000000000000301", "Kaya Tekstil'in tüm açık dosyalarına Selin'i sorumlu avukat ata", at(0, 9, 20)),
      aiMsg(
        "cmg0msg000000000000000302",
        "Kaya Tekstil A.Ş.'nin **4 açık dosyasına** Av. Selin Kaya'yı **sorumlu avukat** olarak ekleyeceğim:\n\n- 2026/145 · 2026/88 · 2025/1312 · 2026/51\n\nOnaylıyor musunuz?",
        [call("tc_3001", "client_lookup", "1 adet", [kaya]), call("tc_3002", "case_list", "4 adet", kayaCases)],
        at(0, 9, 20),
      ),
      userMsg("cmg0msg000000000000000303", "Evet", at(0, 9, 21)),
      aiMsg(
        "cmg0msg000000000000000304",
        "Av. Selin Kaya **4 dosyaya** sorumlu avukat olarak eklendi. Bu dosyalara gelen yeni işler de artık onda görünecek.",
        [call("tc_3003", "case_assignment_create", "")],
        at(0, 9, 21),
      ),
    ],
  },
};
const chatConversations = [
  ...Object.entries(conversations).map(([id, c]) => ({
    id,
    title: c.title,
    isPinned: !!c.pinned,
    createdAt: iso(c.at),
    updatedAt: iso(c.at),
    lastMessagePreview: c.messages[c.messages.length - 1].content.replace(/[*#|]+/g, "").replace(/\s+/g, " ").trim().slice(0, 90),
  })),
  { id: "cmg0conv0istinafsureleri02", title: "Açık istinaf süreleri", isPinned: false, createdAt: iso(at(-1, 16, 5)), updatedAt: iso(at(-1, 16, 7)), lastMessagePreview: "İki dosyada istinaf süresi işliyor; en yakını 2025/318." },
];

// ---------- Raporlar ----------
const bucketsOf = (keys, counts) => keys.map((key, i) => ({ key, count: counts[i] }));
const TASK_KEYS = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
const EVENT_KEYS = ["SCHEDULED", "COMPLETED", "CANCELLED"];
const memberRow = (id, name, keys, counts) => ({ firmMemberId: id, name, total: counts.reduce((a, b) => a + b, 0), buckets: bucketsOf(keys, counts), listFilters: { scope: "report", assignedTo: id } });
const creatorRow = (kind, userId, name, sources, keys, counts) => ({ kind, userId, name, total: counts.reduce((a, b) => a + b, 0), buckets: bucketsOf(keys, counts), listFilters: { scope: "report", ...(userId ? { createdBy: userId } : {}), sources } });
function report(domain, from, to) {
  const tasksDomain = domain === "tasks";
  const K = tasksDomain ? TASK_KEYS : EVENT_KEYS;
  const members = tasksDomain
    ? [memberRow("m-selin", "Selin Kaya", K, [4, 3, 1, 3]), memberRow("m-deniz", "Deniz Yıldız", K, [3, 2, 2, 2]), memberRow("m-mert", "Mert Aydın", K, [3, 2, 0, 2]), memberRow("m-ayse", "Ayşe Demir", K, [2, 1, 0, 3]), memberRow("m-emre", "Emre Şahin", K, [1, 0, 0, 2])]
    : [memberRow("m-deniz", "Deniz Yıldız", K, [7, 3, 0]), memberRow("m-selin", "Selin Kaya", K, [6, 2, 1]), memberRow("m-mert", "Mert Aydın", K, [3, 1, 0])];
  const creators = tasksDomain
    ? [creatorRow("member", "u-deniz", "Deniz Yıldız", "MANUAL", K, [3, 2, 1, 2]), creatorRow("member", "u-selin", "Selin Kaya", "MANUAL", K, [2, 1, 0, 2]), creatorRow("ai", null, null, "UETS,CHAT_AI", K, [6, 3, 1, 4]), creatorRow("uyap", null, null, "UYAP", K, [1, 1, 0, 2])]
    : [creatorRow("member", "u-deniz", "Deniz Yıldız", "MANUAL", K, [3, 1, 0]), creatorRow("ai", null, null, "UETS,CHAT_AI", K, [6, 1, 0]), creatorRow("uyap", null, null, "UYAP", K, [5, 2, 1])];
  const total = creators.reduce((a, c) => a + c.total, 0);
  const buckets = K.map((key) => ({ key, count: creators.reduce((a, c) => a + c.buckets.find((b) => b.key === key).count, 0) }));
  const unassignedCounts = tasksDomain ? [1, 0, 0, 1] : [2, 0, 0];
  return {
    report: {
      domain, range: from && to ? { from, to } : null, groupBy: "status", total, buckets, members,
      unassigned: { total: unassignedCounts.reduce((a, b) => a + b, 0), buckets: bucketsOf(K, unassignedCounts) },
      creators, undated: null,
    },
  };
}

// ---------- Görevler: kişi görünümü (groupBy=assignee) ----------
function kanbanByAssignee(offset = 0) {
  const start = at(-((today.getDay() + 6) % 7) + offset * 7);
  const end = new Date(start.getTime() + 7 * DAY);
  const inWeek = (t) => t.dueAt && new Date(t.dueAt) >= start && new Date(t.dueAt) < end;
  const columns = {};
  for (const m of [...members].sort((a, b) => a.user.firstName.localeCompare(b.user.firstName, "tr"))) {
    columns[m.id] = { label: `${m.user.firstName} ${m.user.lastName}`, tasks: [], undatedTasks: [] };
  }
  for (const t of tasks) {
    for (const a of t.assignees) {
      const col = columns[a.firmMemberId];
      if (!col) continue;
      if (!t.dueAt) col.undatedTasks.push(t);
      else if (inWeek(t)) col.tasks.push(t);
    }
  }
  return { columns, total: tasks.filter(inWeek).length, weekStart: iso(start), weekEnd: iso(end) };
}

// ---------- Büro yönetimi ----------
const invitations = [
  { id: "inv-1", firmId: FIRM_ID, inviterId: "u-deniz", targetEmail: "elif.arslan@yildizhukuk.av.tr", role: "LEGAL_INTERN", status: "PENDING", expiresAt: iso(at(5)), createdAt: iso(at(-2)), lastSentAt: iso(at(-2)), inviter: { id: "u-deniz", firstName: "Deniz", lastName: "Yıldız", email: "deniz@yildizhukuk.av.tr" } },
];
const approvalChain = ["m-selin", "m-deniz"].map((mid, i) => {
  const m = members.find((x) => x.id === mid);
  return { id: `apc-${i + 1}`, level: i + 1, firmMemberId: mid, firmMember: { id: mid, role: m.role, user: { id: m.user.id, firstName: m.user.firstName, lastName: m.user.lastName, avatar: null } } };
});

// ---------- Dosyalar (UYAP senkronundan gelmiş gibi) ----------
const city = { ankara: { id: 6, name: "Ankara" }, istanbul: { id: 34, name: "İstanbul" }, izmir: { id: 35, name: "İzmir" } };
const courthouse = (id, name, c) => ({ id, name, cityId: c.id, city: c });
const CH = {
  ankara: courthouse("ch-ankara", "Ankara Adliyesi", city.ankara),
  bakirkoy: courthouse("ch-bakirkoy", "Bakırköy Adliyesi", city.istanbul),
  anadolu: courthouse("ch-anadolu", "İstanbul Anadolu Adliyesi", city.istanbul),
  istanbul: courthouse("ch-istanbul", "İstanbul Adliyesi", city.istanbul),
  izmir: courthouse("ch-izmir", "İzmir Adliyesi", city.izmir),
};
const CT = {
  ah: { id: "cty-ah", name: "Asliye Hukuk Mahkemesi", jurisdictionType: "CIVIL" },
  at: { id: "cty-at", name: "Asliye Ticaret Mahkemesi", jurisdictionType: "CIVIL" },
  is: { id: "cty-is", name: "İş Mahkemesi", jurisdictionType: "CIVIL" },
  tk: { id: "cty-tk", name: "Tüketici Mahkemesi", jurisdictionType: "CIVIL" },
  sh: { id: "cty-sh", name: "Sulh Hukuk Mahkemesi", jurisdictionType: "CIVIL" },
  ac: { id: "cty-ac", name: "Asliye Ceza Mahkemesi", jurisdictionType: "CRIMINAL" },
  id: { id: "cty-id", name: "İdare Mahkemesi", jurisdictionType: "ADMINISTRATIVE" },
};
Object.assign(cases, {
  c2210: { id: "c-2210", subject: "Kiralanan Taşınmazın Tahliyesi", fileNumber: "2210", fileYear: 2026, courtName: "İstanbul 5. Sulh Hukuk Mahkemesi", caseCategory: "CIVIL" },
  c45: { id: "c-45", subject: "İmar Para Cezasının İptali", fileNumber: "45", fileYear: 2026, courtName: "Ankara 4. İdare Mahkemesi", caseCategory: "ADMINISTRATIVE" },
  c1893: { id: "c-1893", subject: "Ticari Alacak", fileNumber: "1893", fileYear: 2024, courtName: "İzmir 2. Asliye Ticaret Mahkemesi", caseCategory: "CIVIL" },
  c532: { id: "c-532", subject: "Tapu İptali ve Tescil", fileNumber: "532", fileYear: 2024, courtName: "Ankara 21. Asliye Hukuk Mahkemesi", caseCategory: "CIVIL" },
  c2718: { id: "c-2718", subject: "Ortaklığın Giderilmesi", fileNumber: "2718", fileYear: 2023, courtName: "İzmir 5. Sulh Hukuk Mahkemesi", caseCategory: "CIVIL" },
});
// Takvimdeki ilk yaklaşan duruşma (kart ile takvim aynı şeyi söylesin).
const upcomingHearing = (caseId) =>
  calendarItems
    .filter((i) => i.caseId === caseId && i.eventType === "HEARING" && new Date(i.startAt) > new Date())
    .sort((a, b) => a.startAt.localeCompare(b.startAt))[0];
const dosyaTurOf = (c) => ({ CRIMINAL: "Ceza Dava Dosyası", ADMINISTRATIVE: "İdari Dava Dosyası" })[c.caseCategory] ?? "Hukuk Dava Dosyası";
let uyapSeq = 0;
function caseItem(c, o) {
  uyapSeq += 1;
  const h = o.hearingAt ? { startAt: iso(o.hearingAt) } : o.noHearing ? null : upcomingHearing(c.id);
  const nextHearing = h
    ? { id: `h-${c.id}`, scheduledAt: h.startAt, hearingTypeCode: "D", hearingTypeLabel: "Duruşma", hearingNumber: o.hearingNo ?? 2, yerelBirimAd: c.courtName }
    : undefined;
  const docs = o.docs ?? 20;
  return {
    id: c.id,
    firmId: FIRM_ID,
    fileYear: c.fileYear,
    fileNumber: c.fileNumber,
    internalNumber: o.internal,
    ourRole: o.role,
    isOpen: true,
    uyapStatus: o.status ?? "Açık",
    lifecycleStage: o.stage ?? "OPEN",
    courtName: c.courtName,
    caseValue: o.value,
    filedAt: iso(o.filedAt),
    nextHearingAt: nextHearing?.scheduledAt,
    nextHearing,
    subject: c.subject,
    caseSubject: o.caseSubject,
    dosyaTur: dosyaTurOf(c),
    uyapCaseId: String(47120000 + uyapSeq * 7919),
    uyapCaseKey: `demo-${c.id}`,
    uyapBirimId: String(1004400 + uyapSeq),
    caseCategory: c.caseCategory,
    caseType: { id: `ct-${c.id}`, name: o.type, category: c.caseCategory },
    courthouse: o.ch,
    courtType: o.ct,
    source: "integration",
    listedReason: "NORMAL",
    updatedAt: iso(at(-1, 18, 20)),
    _count: { parties: o.parties ?? 2, hearings: o.hearings ?? 3, assignments: 2, documents: docs },
    documentCounts: { total: docs, downloaded: docs - (o.pending ?? 0), pending: o.pending ?? 0 },
    bulkDownloadDisabled: false,
    uyapDocumentTotal: docs,
  };
}

// ---------- Evrak: 2025/318 (hero'daki istinaf süresinin dosyası) ----------
const GK = { self: "2025/318(Hukuk Dava Dosyası)", dis: "2025/96(Hukuk Değişik İş Dosyası)" };
const fold = (s) =>
  (s || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u");
const slug = (s) => fold(s).replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
let evrakNo = 0;
function evrak(id, title, o) {
  evrakNo += 1;
  const d = at(o.day, o.h ?? 9 + (evrakNo % 7), (evrakNo * 13) % 60);
  const ext = o.ext ?? "udf";
  const key = `demo${id.replace(/\W/g, "")}`;
  return {
    id,
    title,
    file: o.pending
      ? null
      : {
          storageKey: `demo/${id}`,
          fileName: `${slug(o.name ?? title)}.${ext}`,
          fileSize: o.size ?? 18000 + ((evrakNo * 7919) % 150000),
          mimeType: ext === "pdf" ? "application/pdf" : "application/octet-stream",
        },
    documentDate: null,
    uyapDate: iso(d),
    uyapDocId: key,
    uyapCourtDocNo: evrakNo,
    uyapBirimId: "1004413",
    uyapDocKey: key,
    uyapGroupKey: o.group ?? GK.self,
    parentUyapDocKey: o.parent ? `demo${o.parent.replace(/\W/g, "")}` : null,
    attachmentOrder: o.order ?? null,
    parentDocumentId: o.parent ?? null,
    skipReason: null,
    owner: o.owner,
    uyapDirection: o.owner === "COURT" ? "DOSYA" : "GLN",
    uyapSender: o.sender ?? null,
    uyapSystemDate: iso(d),
    createdAt: iso(d),
    description: o.description ?? null,
    childCount: 0,
    childDownloadedCount: 0,
  };
}
const US = { owner: "US", sender: "Av. Deniz Yıldız" };
const THEM = { owner: "OPPOSING_PARTY", sender: "Av. Kerem Tunç" };
const COURT = { owner: "COURT" };
const evraklar = [
  evrak("e-dava", "Dava Dilekçesi", { day: -340, ...US }),
  evrak("e-dava-1", "Proje Hizmet Sözleşmesi", { day: -340, parent: "e-dava", order: 1, ext: "pdf" }),
  evrak("e-dava-2", "İhtarname", { day: -340, parent: "e-dava", order: 2, ext: "pdf" }),
  evrak("e-dava-3", "Hakediş Tablosu", { day: -340, parent: "e-dava", order: 3, ext: "pdf" }),
  evrak("e-vekalet", "Vekaletname", { day: -340, ext: "pdf", ...US }),
  evrak("e-makbuz-1", "Makbuz", { day: -340, ext: "pdf", description: "Başvuru ve peşin harç" }),
  evrak("e-tensip", "Tensip Zaptı", { day: -336, ...COURT }),
  evrak("e-mazbata-1", "Tebligat Mazbatası", { day: -318, ext: "pdf", ...COURT }),
  evrak("e-mazbata-2", "Tebligat Mazbatası", { day: -316, ext: "pdf", ...COURT }),
  evrak("e-cevap", "Cevap Dilekçesi", { day: -305, ...THEM, description: "Sözleşmenin feshi ve eksik ifa savunması" }),
  evrak("e-cevap-1", "Fesih Bildirimi", { day: -305, parent: "e-cevap", order: 1, ext: "pdf" }),
  evrak("e-cevaba", "Cevaba Cevap Dilekçesi", { day: -290, ...US }),
  evrak("e-mazbata-3", "Tebligat Mazbatası", { day: -287, ext: "pdf", ...COURT }),
  evrak("e-ikinci", "İkinci Cevap Dilekçesi", { day: -276, ...THEM }),
  evrak("e-onin", "Ön İnceleme Zaptı", { day: -230, ...COURT }),
  evrak("e-tanik", "Tanık Bildirim Dilekçesi", { day: -223, ...US }),
  evrak("e-makbuz-2", "Makbuz", { day: -223, ext: "pdf", description: "Tanık ücreti ve tebligat gideri" }),
  evrak("e-muzekkere", "Müzekkere Cevabı", { day: -198, ext: "pdf", description: "Belediye imar müdürlüğü — proje onay kayıtları" }),
  evrak("e-zapt-1", "Duruşma Zaptı", { day: -170, ...COURT }),
  evrak("e-mazbata-4", "Tebligat Mazbatası", { day: -160, ext: "pdf", pending: true, ...COURT }),
  evrak("e-makbuz-3", "Makbuz", { day: -150, ext: "pdf", description: "Bilirkişi ücreti avansı" }),
  evrak("e-bilirkisi", "Bilirkişi Raporu", { day: -121, ext: "pdf", owner: "EXPERT", description: "Sözleşme kapsamında tamamlanan proje aşamaları ve hizmet bedeli hesabı" }),
  evrak("e-itiraz", "Bilirkişi Raporuna İtiraz Dilekçesi", { day: -106, ...US }),
  evrak("e-mazbata-5", "Tebligat Mazbatası", { day: -104, ext: "pdf", ...COURT }),
  evrak("e-ekrapor", "Bilirkişi Ek Raporu", { day: -71, ext: "pdf", owner: "EXPERT" }),
  evrak("e-zapt-2", "Duruşma Zaptı", { day: -60, ...COURT }),
  evrak("e-beyan", "Beyan Dilekçesi", { day: -44, ...THEM }),
  evrak("e-zapt-3", "Duruşma Zaptı", { day: -21, ...COURT, description: "Karar duruşması" }),
  evrak("e-mazbata-6", "Tebligat Mazbatası", { day: -18, ext: "pdf", pending: true, ...COURT }),
  evrak("e-gerekceli", "Gerekçeli Karar Evrakı", { day: -6, ...COURT, name: "gerekceli_karar" }),
  evrak("e-mazbata-7", "Tebligat Mazbatası", { day: -1, ext: "pdf", pending: true, ...COURT }),
  // Dava öncesi delil tespiti (değişik iş) dosyası
  evrak("e-dis-karar", "Değişik İş Karar Evrakı", { day: -402, ...COURT, group: GK.dis }),
  evrak("e-dis-rapor", "Bilirkişi Raporu", { day: -395, ext: "pdf", owner: "EXPERT", group: GK.dis, description: "Delil tespiti — teslim edilen proje dosyalarının incelenmesi" }),
];
const roots = evraklar.filter((e) => !e.parentDocumentId);
const childrenOf = (id) => evraklar.filter((e) => e.parentDocumentId === id);
for (const r of roots) {
  r.childCount = childrenOf(r.id).length;
  r.childDownloadedCount = childrenOf(r.id).filter((k) => k.file).length;
}
const countsOf = (list) => {
  const all = list.flatMap((r) => [r, ...childrenOf(r.id)]);
  const downloaded = all.filter((e) => e.file).length;
  return { total: all.length, downloaded, pending: all.length - downloaded };
};
const docGroups = [GK.self, GK.dis].map((groupKey, i) => {
  const rs = roots.filter((r) => r.uyapGroupKey === groupKey);
  return { groupKey, rootCount: rs.length, totalCount: countsOf(rs).total, isSelf: i === 0 };
});
// Sunucu araması gibi: ad, açıklama ve eklerde; Türkçe harfler katlanır.
function searchDocs(q) {
  const needle = fold(q.trim());
  const hit = (e) => fold(e.title).includes(needle) || fold(e.description).includes(needle);
  return roots.flatMap((r) => {
    const reasons = [];
    if (fold(r.title).includes(needle)) reasons.push("TITLE");
    if (fold(r.description).includes(needle)) reasons.push("DESCRIPTION");
    const kids = childrenOf(r.id).filter(hit);
    if (kids.length) reasons.push("ATTACHMENT");
    return reasons.length ? [{ ...r, matchReasons: reasons, matchedChildCount: kids.length, matchedChildren: kids.slice(0, 3) }] : [];
  });
}
const fullDoc = (e) => ({
  id: e.id,
  firmId: FIRM_ID,
  caseId: cases.c318.id,
  typeId: `dt-${slug(e.title)}`,
  title: e.title,
  description: e.description ?? undefined,
  source: "UYAP",
  status: "RECEIVED",
  owner: e.owner,
  documentDate: e.uyapDate,
  file: e.file,
  groupKey: e.uyapGroupKey,
  hasDeadline: false,
  isOversized: false,
  skipReason: null,
  uyapDocId: e.uyapDocId,
  uyapDirection: e.uyapDirection,
  uyapDate: e.uyapDate,
  uyapCourtDocNo: e.uyapCourtDocNo,
  uyapSender: e.uyapSender ?? undefined,
  uyapSystemDate: e.uyapSystemDate,
  uyapBirimId: e.uyapBirimId,
  uyapDocKey: e.uyapDocKey,
  uyapGroupKey: e.uyapGroupKey,
  parentDocumentId: e.parentDocumentId,
  parentUyapDocKey: e.parentUyapDocKey,
  attachmentOrder: e.attachmentOrder,
  isDeleted: false,
  createdAt: e.createdAt,
  updatedAt: e.createdAt,
  type: { id: `dt-${slug(e.title)}`, name: e.title, category: "COURT", hasDeadline: false },
});

const caseList = [
  caseItem(cases.c2210, { role: "PLAINTIFF", type: "Tahliye", value: 360000, filedAt: at(-20), hearingAt: at(36, 10, 20), hearingNo: 1, hearings: 1, docs: 9, ch: CH.istanbul, ct: CT.sh }),
  caseItem(cases.c611, { role: "PARTICIPANT", type: "Dolandırıcılık", filedAt: at(-75), hearingNo: 1, hearings: 1, docs: 14, ch: CH.anadolu, ct: CT.ac }),
  caseItem(cases.c45, { role: "PLAINTIFF", type: "İptal Davası", value: 214300, filedAt: at(-110), noHearing: true, hearings: 0, docs: 7, ch: CH.ankara, ct: CT.id }),
  caseItem(cases.c1127, { role: "DEFENDANT", type: "Tüketici Davası", value: 96000, filedAt: at(-280), hearingAt: at(44, 9, 40), hearingNo: 3, docs: 26, ch: CH.izmir, ct: CT.tk }),
  caseItem(cases.c904, { role: "PLAINTIFF", type: "Tazminat", value: 1850000, filedAt: at(-300), hearingNo: 3, docs: 38, pending: 2, ch: CH.ankara, ct: CT.at }),
  caseItem(cases.c318, {
    role: "PLAINTIFF",
    status: "Karara Çıkmış",
    type: "Alacak Davası",
    caseSubject: "Alacak (Proje Hizmet Bedeli)",
    value: 486500,
    filedAt: at(-340),
    noHearing: true,
    parties: 3,
    docs: evraklar.length,
    pending: evraklar.filter((e) => !e.file).length,
    ch: CH.ankara,
    ct: CT.ah,
    internal: "YHB-2025-041",
  }),
  caseItem(cases.c77, { role: "PLAINTIFF", type: "İşçilik Alacağı", value: 412750, filedAt: at(-370), hearingNo: 2, docs: 31, pending: 1, ch: CH.bakirkoy, ct: CT.is }),
  caseItem(cases.c1893, { role: "DEFENDANT", status: "İstinafta", stage: "IN_APPEAL", type: "Alacak Davası", value: 2475000, filedAt: at(-640), noHearing: true, docs: 64, ch: CH.izmir, ct: CT.at }),
  caseItem(cases.c532, { role: "DEFENDANT", type: "Tapu İptali ve Tescil", value: 3200000, filedAt: at(-760), hearingAt: at(16, 11, 20), hearingNo: 6, hearings: 6, docs: 88, pending: 4, ch: CH.ankara, ct: CT.ah }),
  caseItem(cases.c2718, { role: "PLAINTIFF", status: "Yargıtayda", stage: "IN_CASSATION", type: "Ortaklığın Giderilmesi", filedAt: at(-1100), noHearing: true, docs: 112, ch: CH.izmir, ct: CT.sh }),
];

// Dosya kartı: taraflar UYAP'tan gelir, müvekkil ve karşı taraf kartlarına bağlanır.
const partyCard = (id, kind, o) => ({
  id,
  firmId: FIRM_ID,
  type: o.tradeName ? "LEGAL" : "NATURAL",
  kind,
  source: "UYAP",
  mergeHistoryCount: 0,
  activeMergeSourceCount: 0,
  uyapPartyId: null,
  firstName: o.firstName ?? null,
  lastName: o.lastName ?? null,
  nationalId: null,
  passportNo: null,
  foreignId: null,
  tradeName: o.tradeName ?? null,
  taxNumber: null,
  mersisNo: null,
  email: null,
  phone: null,
  phoneCountryCode: null,
  address: null,
  addressCountryCode: null,
  postalCode: null,
  cityId: null,
  city: null,
  districtId: null,
  district: null,
  neighborhoodId: null,
  neighborhood: null,
  activeCaseCount: o.activeCaseCount ?? 1,
  activeCases: [],
  isOurClient: kind === "OWN_CLIENT",
  azilWarningAt: null,
  azilWarningNoticeId: null,
  isDeleted: false,
  deletedAt: null,
  createdAt: iso(at(-340)),
  updatedAt: iso(at(-6)),
});
const caseParty = (id, role, uyapRawRole, partySide, client, attorney = null) => ({
  id,
  caseId: cases.c318.id,
  role,
  uyapRawRole,
  source: "UYAP",
  partySide,
  attorney,
  isOurClient: client.kind === "OWN_CLIENT",
  clientId: client.id,
  client,
});
const caseAssignment = (i, role, memberId) => {
  const m = members.find((x) => x.id === memberId);
  return { id: `ca-${i}`, caseId: cases.c318.id, role, assignedAt: iso(at(-340)), firmMember: { id: m.id, user: { id: m.user.id, firstName: m.user.firstName, lastName: m.user.lastName, email: m.user.email } } };
};
function caseDetail(id) {
  const item = caseList.find((c) => c.id === id) ?? caseList.find((c) => c.id === cases.c318.id);
  const base = { ...item, opposingLawyers: [], ourWitnesses: [], opposingWitnesses: [], parties: [], relations: [], assignments: [], createdAt: item.filedAt, updatedAt: item.updatedAt };
  if (item.id !== cases.c318.id) return base;
  return {
    ...base,
    description: "Proje hizmet bedeli alacağının tahsili.",
    courtNumber: 7,
    decisionNumber: "2026/402",
    firstInstanceDecisionAt: iso(at(-21)),
    isSimplifiedProcedure: false,
    ourWitnesses: ["Hakan Öztürk"],
    opposingWitnesses: ["Levent Koç"],
    parties: [
      caseParty("cp-1", "PLAINTIFF", "Davacı", "PLAINTIFF", partyCard("cl-zeynep", "OWN_CLIENT", { firstName: "Zeynep", lastName: "Arslan", activeCaseCount: 2 }), "Av. Deniz Yıldız"),
      caseParty("cp-2", "DEFENDANT", "Davalı", "DEFENDANT", partyCard("cl-tuna", "OPPOSING_PARTY", { tradeName: "Tuna Yapı Denetim A.Ş." }), "Av. Kerem Tunç"),
      caseParty("cp-3", "NOTICE_RECIPIENT", "İhbar Olunan", "OTHER", partyCard("cl-bora", "OPPOSING_PARTY", { tradeName: "Bora Mühendislik Ltd. Şti." })),
    ],
    assignments: [caseAssignment(1, "LEAD", "m-deniz"), caseAssignment(2, "ASSOCIATE", "m-selin"), caseAssignment(3, "INTERN", "m-mert")],
    createdBy: { id: "u-deniz", firstName: "Deniz", lastName: "Yıldız" },
  };
}

const ok = (data) => ({ body: { success: true, data } });
const page = (key, list) => ok({ [key]: list, pagination: { page: 1, limit: 20, total: list.length, totalPages: 1 } });

function documentsResponse(sp) {
  const groupKey = sp.get("groupKey");
  if (sp.get("light") === "true") {
    const light = (documents, extra) => ok({ documents, total: documents.length, truncated: false, orphanCount: 0, ...extra });
    if (sp.get("parentDocumentId")) return light(childrenOf(sp.get("parentDocumentId")));
    if (sp.get("search")) return light(searchDocs(sp.get("search")));
    const list = roots.filter((r) => !groupKey || r.uyapGroupKey === groupKey);
    return light(list, { counts: countsOf(list) });
  }
  // Tam liste (dışa aktarma, duruşma evrakları)
  const list = evraklar.filter((e) => !groupKey || e.uyapGroupKey === groupKey);
  const limit = Number(sp.get("limit") || 20);
  const pg = Number(sp.get("page") || 1);
  return ok({
    documents: list.slice((pg - 1) * limit, pg * limit).map(fullDoc),
    counts: countsOf(list.filter((e) => !e.parentDocumentId)),
    pagination: { page: pg, limit, total: list.length, totalPages: Math.max(1, Math.ceil(list.length / limit)) },
  });
}
function downloadMeta(id) {
  const e = evraklar.find((x) => x.id === id);
  if (!e?.file) return null;
  return {
    url: `/demo-files/${encodeURIComponent(e.file.fileName)}`,
    fileName: e.file.fileName,
    mimeType: e.file.mimeType,
    expiresIn: 3600,
    isEncrypted: false,
    encryptionIv: null,
    encryptedDek: null,
    dekIv: null,
    firmKeyVersion: 1,
    uyapDocId: e.uyapDocId,
    uyapBirimId: e.uyapBirimId,
    caseId: cases.c318.id,
    uyapDocKey: e.uyapDocKey,
  };
}

function respond(method, url) {
  const p = url.pathname.replace(/^\/api/, "");
  if (method !== "GET") return ok({});
  if (p === "/auth/csrf" || p.endsWith("/csrf-token")) return ok({ csrfToken: "demo-csrf" });
  if (p === "/auth/me") return ok(user);
  if (p === "/auth/socket-token") return ok({ token: "demo-socket" });
  if (p === "/firms/me") return ok({ firm: { id: FIRM_ID, name: "Yıldız Hukuk Bürosu", logo: null, memberCount: members.length }, role: "OWNER" });
  if (p === `/firms/${FIRM_ID}/members`) return ok({ members });
  // Dashboard'daki arka plan işleyicisi bekleyen tebligatları ister: hiçbiri yok.
  if (p === `/firms/${FIRM_ID}/notices` && url.searchParams.get("aiStatus") === "PENDING") return page("notices", []);
  if (p === `/firms/${FIRM_ID}/notices` && url.searchParams.get("caseId")) return page("notices", notices.filter((n) => n.caseId === url.searchParams.get("caseId")));
  if (p === `/firms/${FIRM_ID}/notices`) return page("notices", notices);
  const nd = p.match(new RegExp(`^/firms/${FIRM_ID}/notices/([^/]+)$`));
  if (nd) return ok({ notice: notices.find((n) => n.id === nd[1]) || notices[0] });
  if (p === `/firms/${FIRM_ID}/notifications/unread-count`) return ok({ count: notifications.filter((n) => !n.isRead).length });
  if (p === `/firms/${FIRM_ID}/notifications`) return page("notifications", notifications);
  if (p === `/firms/${FIRM_ID}/uets-sync-status`) return ok(uetsSyncStatus);
  // Dosyalar ve evrak (sıra önemli: özel yollar genel :id yolundan önce)
  if (p === `/firms/${FIRM_ID}/cases/yargi-birimleri`) return ok({ yargiBirimleri: Object.values(CT) });
  if (p === `/firms/${FIRM_ID}/cases`) {
    const list = url.searchParams.get("caseCategory") === "ENFORCEMENT" ? [] : caseList;
    return ok({ cases: list, pagination: { page: 1, limit: 20, total: list.length ? 186 : 0, totalPages: list.length ? 10 : 0 } });
  }
  if (/^\/firms\/[^/]+\/cases\/[^/]+\/hearings\/next-number$/.test(p)) return ok({ nextNumber: 4 });
  if (/^\/firms\/[^/]+\/cases\/[^/]+\/hearings$/.test(p)) return ok({ hearings: [], pagination: { page: 1, limit: 500, total: 0, totalPages: 0 } });
  const cd = p.match(new RegExp(`^/firms/${FIRM_ID}/cases/([^/]+)$`));
  if (cd) return ok({ case: caseDetail(cd[1]) });
  if (p === `/firms/${FIRM_ID}/documents/groups`) return ok({ groups: docGroups, totalGroups: docGroups.length, totalDocuments: evraklar.length });
  const dl = p.match(new RegExp(`^/firms/${FIRM_ID}/documents/([^/]+)/download$`));
  if (dl) return ok(downloadMeta(dl[1]));
  if (p === `/firms/${FIRM_ID}/documents`) return documentsResponse(url.searchParams);
  if (p === `/firms/${FIRM_ID}/parties/pending`) return ok({ total: 0 });
  if (p === "/court-types") return ok({ courtTypes: Object.values(CT) });
  if (p === "/courthouses") return ok({ courthouses: Object.values(CH) });
  if (p === "/document-types") return ok({ documentTypes: [] });
  if (p === `/firms/${FIRM_ID}/calendar`) {
    const from = url.searchParams.get("fromDate");
    const to = url.searchParams.get("toDate");
    const caseId = url.searchParams.get("caseId");
    const items = calendarItems.filter(
      (i) => (!from || i.startAt >= from) && (!to || i.startAt <= to) && (!caseId || i.caseId === caseId),
    );
    return ok({ items, total: items.length });
  }
  const notes = p.match(new RegExp(`^/firms/${FIRM_ID}/calendar-events/([^/]+)/notes$`));
  if (notes) return ok({ notes: eventNotes[notes[1]] ?? [] });
  if (p === `/firms/${FIRM_ID}/calendar-events`) return page("calendarEvents", []);
  const comments = p.match(new RegExp(`^/firms/${FIRM_ID}/tasks/([^/]+)/comments$`));
  if (comments) return ok({ comments: taskComments[comments[1]] ?? [] });
  const ev = p.match(new RegExp(`^/firms/${FIRM_ID}/calendar-events/([^/]+)$`));
  if (ev) return ok({ calendarEvent: eventDetail(ev[1]) });
  const tk = p.match(new RegExp(`^/firms/${FIRM_ID}/tasks/([^/]+)$`));
  if (tk) return ok({ task: tasks.find((t) => t.id === tk[1]) || tasks[0] });
  if (p === `/firms/${FIRM_ID}/tasks` && url.searchParams.get("calendarEventId")) {
    const eid = url.searchParams.get("calendarEventId");
    const linked = tasks.filter((t) => calendarItems.some((i) => i.id === eid && i.taskId === t.id));
    return ok({ tasks: linked, pagination: { page: 1, limit: 50, total: linked.length, totalPages: 1 } });
  }
  if (p === `/firms/${FIRM_ID}/tasks`) {
    const view = url.searchParams.get("view");
    if (view === "weekly") return ok(weekly(Number(url.searchParams.get("weekOffset") || 0)));
    if (view === "kanban" && url.searchParams.get("groupBy") === "assignee") return ok(kanbanByAssignee(Number(url.searchParams.get("weekOffset") || 0)));
    if (view === "kanban") return ok(kanban());
    const caseId = url.searchParams.get("caseId");
    const list = caseId ? tasks.filter((t) => t.caseId === caseId) : tasks;
    return ok({ tasks: list, pagination: { page: 1, limit: 20, total: list.length, totalPages: 1 } });
  }
  if (p === `/firms/${FIRM_ID}/clients`) return page("clients", []);
  if (p === `/firms/${FIRM_ID}/chat/conversations`) return ok({ conversations: chatConversations });
  const convo = p.match(new RegExp(`^/firms/${FIRM_ID}/chat/conversations/([^/]+)/messages$`));
  if (convo) return ok({ conversationId: convo[1], messages: conversations[convo[1]]?.messages ?? [] });
  if (p === `/firms/${FIRM_ID}/reports/tasks`) return ok(report("tasks", url.searchParams.get("from"), url.searchParams.get("to")));
  if (p === `/firms/${FIRM_ID}/reports/calendar-events`) return ok(report("calendar-events", url.searchParams.get("from"), url.searchParams.get("to")));
  if (p === `/firms/${FIRM_ID}/invitations`) return ok({ invitations });
  if (p === "/invitations/pending") return ok({ invitations: [] });
  if (p === `/firms/${FIRM_ID}/approval-chain`) return ok({ chain: approvalChain });
  if (p === `/firms/${FIRM_ID}/approval-settings`) return ok({ approvalRequiredTypes: ["DEADLINE", "EXECUTION_TRACKING"] });
  if (p === "/cities") return ok({ cities: [{ id: 6, name: "Ankara" }, { id: 34, name: "İstanbul" }, { id: 35, name: "İzmir" }] });
  return ok(null);
}

// Önizlemede açılan evrak dosyaları: /demo-files/<ad> → { type, body }
// 2025/318'in gerekçeli kararı (kurgusal metin, UYAP'ın UDF biçiminde).
const trDate = (d) =>
  new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Istanbul" })
    .format(d)
    .replace(/\./g, "/");
const heading = (text) => ({ runs: [{ text, bold: true }], align: 1 });
const field = (label, value) => ({ runs: [{ text: `${label}\t:`, bold: true }, { text: ` ${value}` }], tabs: "118:0" });
const body = (text, lead) => ({ runs: lead ? [{ text: lead, bold: true }, { text: ` ${text}` }] : [{ text }], align: 3, indent: 28, below: 6 });
const blank = { runs: [] };
const gerekceliKarar = udfDocument([
  heading("T.C."),
  heading("ANKARA"),
  heading("7. ASLİYE HUKUK MAHKEMESİ"),
  blank,
  heading("GEREKÇELİ KARAR"),
  blank,
  field("ESAS NO", "2025/318 Esas"),
  field("KARAR NO", "2026/402"),
  blank,
  field("HAKİM", "204918"),
  field("KATİP", "311507"),
  blank,
  field("DAVACI", "ZEYNEP ARSLAN"),
  field("VEKİLİ", "Av. DENİZ YILDIZ"),
  field("DAVALI", "TUNA YAPI DENETİM A.Ş."),
  field("VEKİLİ", "Av. KEREM TUNÇ"),
  field("İHBAR OLUNAN", "BORA MÜHENDİSLİK LTD. ŞTİ."),
  blank,
  field("DAVA", "Alacak (Proje Hizmet Bedeli)"),
  field("DAVA TARİHİ", trDate(at(-340))),
  field("KARAR TARİHİ", trDate(at(-21))),
  field("YAZIM TARİHİ", trDate(at(-6))),
  blank,
  body("Mahkememizde görülmekte olan Alacak davasının yapılan açık yargılaması sonunda, dosya incelendi, gereği düşünüldü:"),
  body(
    "Davacı vekili dava dilekçesinde özetle; müvekkilinin davalı şirketle imzaladığı proje hizmet sözleşmesi kapsamında mimari proje hizmeti verdiğini, işin teslim edilmesine rağmen hizmet bedelinin bakiye kısmının ödenmediğini, gönderilen ihtarnamenin sonuçsuz kaldığını beyan ederek fazlaya ilişkin hakları saklı kalmak kaydıyla alacağın ihtar tarihinden itibaren işleyecek yasal faiziyle birlikte davalıdan tahsilini talep etmiştir.",
    "DAVA:",
  ),
  body(
    "Davalı vekili cevap dilekçesinde özetle; sözleşmede kararlaştırılan proje aşamalarının süresinde ve eksiksiz teslim edilmediğini, sözleşmenin haklı nedenle feshedildiğini, talep edilen bedelin fiilen tamamlanan işin karşılığı olmadığını savunarak davanın reddini talep etmiştir.",
    "SAVUNMA:",
  ),
  body(
    "Taraflar arasındaki sözleşme, ihtarname, hakediş tablosu, tanık beyanları, bilirkişi kök ve ek raporları ile tüm dosya kapsamı birlikte değerlendirilmiştir. Bilirkişi raporlarında, sözleşmede kararlaştırılan dört proje aşamasından ikisinin süresinde teslim edildiği ve bu aşamalara ait bedelin davalı tarafından ödendiği tespit edilmiştir. Kalan aşamaların teslim edildiği davacı tarafından ispat edilememiştir.",
    "DELİLLER VE GEREKÇE:",
  ),
  body("Açıklanan nedenlerle davanın reddine karar verilerek aşağıdaki şekilde hüküm kurulmuştur."),
  { runs: [{ text: "HÜKÜM:", bold: true }, { text: " Gerekçesi yukarıda açıklandığı üzere;" }], below: 4 },
  body("1- Davanın REDDİNE,"),
  body("2- Alınması gereken karar ve ilam harcının peşin alınan harçtan mahsubu ile fazla alınan harcın karar kesinleştiğinde ve talep halinde davacıya iadesine,"),
  body("3- Davalı kendisini vekil ile temsil ettirdiğinden, karar tarihinde yürürlükte olan Avukatlık Asgari Ücret Tarifesi uyarınca belirlenen vekalet ücretinin davacıdan alınarak davalıya verilmesine,"),
  body("4- Taraflarca yatırılan gider avansından kullanılmayan kısmın karar kesinleştiğinde yatıran tarafa iadesine,"),
  body(
    `Dair, taraf vekillerinin yüzüne karşı, gerekçeli kararın tebliğinden itibaren 2 hafta içinde Ankara Bölge Adliye Mahkemesine istinaf yolu açık olmak üzere verilen karar açıkça okunup usulen anlatıldı. ${trDate(at(-21))}`,
  ),
  blank,
  { runs: [{ text: "Katip 311507\tHakim 204918" }], tabs: "320:0" },
  { runs: [{ text: "e-imzalıdır\te-imzalıdır" }], tabs: "320:0" },
]);
const files = {
  "gerekceli_karar.udf": { type: "application/octet-stream", body: gerekceliKarar },
};
const file = (name) => files[name];

// Karelerin alt yazılarında kullanılan gerçekler
const facts = { conversationId: CONV, conversations: { week: CONV, client: CONV_CLIENT, task: CONV_TASK, check: CONV_CHECK }, served, istinafDue, court: cases.c318.courtName, caseNo: `${cases.c318.fileYear}/${cases.c318.fileNumber}` };
return { respond, file, facts };
}

module.exports = { createDemo };
