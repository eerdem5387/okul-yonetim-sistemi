/**
 * IB belge tanımları – Excel "Ib term list" kaynağı
 * Her belge: ad (TR/EN), doldurulacak alanlar (EN/TR), outcome şablonu (varsa).
 */

export interface BelgeAlani {
  key: string
  labelEN: string
  labelTR: string
}

export interface BelgeTanimi {
  id: string
  nameTR: string
  nameEN: string
  fields: BelgeAlani[]
  /** Puan / seviye / sıra metni şablonu (EN). Placeholder: [Score], [AchievementLevel], [Place], [TotalParticipants] */
  outcomeTemplateEN?: string
  outcomeTemplateTR?: string
  not?: string
}

/** Tüm belge tanımları (Excel’deki sırayla) */
export const IB_BELGE_TANIMLARI: BelgeTanimi[] = [
  {
    id: "ib_dosyalama_talep_formu",
    nameTR: "IB Dosyalama Talep Formu",
    nameEN: "IB Filing Request Form",
    fields: [
      { key: "participantName", labelEN: "Participant Name & Surname", labelTR: "Katılımcı Adı ve Soyadı" },
      { key: "participantTrId", labelEN: "Participant TR ID No", labelTR: "Katılımcı TC Kimlik No" },
      { key: "requestDate", labelEN: "Request Date", labelTR: "Talep Tarihi" },
      { key: "requestedBy", labelEN: "Requested By", labelTR: "Talep Eden" },
      { key: "processStartDate", labelEN: "Process Start Date", labelTR: "Süreç Başlangıç Tarihi" },
      { key: "contactInfo", labelEN: "Contact Information", labelTR: "İletişim Bilgileri" },
      { key: "parentName", labelEN: "Parent Name:", labelTR: "Ebeveyn Adı:" },
      { key: "parentSurname", labelEN: "Parent Surname:", labelTR: "Ebeveyn Soyadı:" },
      { key: "parentSignature", labelEN: "Parent Signature:", labelTR: "Ebeveyn İmzası:" },
    ],
  },
  {
    id: "ib_katilim_onay_formu",
    nameTR: "IB Katılım Onay Formu",
    nameEN: "IB Participation Approval Form",
    fields: [
      { key: "participantName", labelEN: "Participant Name & Surname", labelTR: "Katılımcı Adı ve Soyadı" },
      { key: "participantTrId", labelEN: "Participant TR ID No", labelTR: "Katılımcı TC Kimlik No" },
      { key: "requestDate", labelEN: "Request Date", labelTR: "Talep Tarihi" },
      { key: "requestedBy", labelEN: "Requested By", labelTR: "Talep Eden" },
      { key: "processStartDate", labelEN: "Process Start Date", labelTR: "Süreç Başlangıç Tarihi" },
      { key: "contactInfo", labelEN: "Contact Information", labelTR: "İletişim Bilgileri" },
      { key: "principalName", labelEN: "Principal Name Surname:", labelTR: "Müdür Adı Soyadı:" },
      { key: "vicePrincipalName", labelEN: "Vice Principal Name Surname:", labelTR: "Müdür Yardımcısı Adı Soyadı:" },
      { key: "principalSignature", labelEN: "Principal's Signature/Stamp:", labelTR: "Müdür İmzası/Mührü:" },
      { key: "vicePrincipalSignature", labelEN: "Vice Principal's Signature/Stamp:", labelTR: "Müdür Yardımcısı İmzası/Mührü:" },
      { key: "approvalDate", labelEN: "Approval Date:", labelTR: "Onay Tarihi:" },
    ],
  },
  {
    id: "ingilizce_fen_bilimi_mufredat",
    nameTR: "İngilizce Fen Bilimi Müfredat",
    nameEN: "English Science Curriculum",
    fields: [
      { key: "participantName", labelEN: "Participant Name & Surname", labelTR: "Katılımcı Adı ve Soyadı" },
      { key: "participantTrId", labelEN: "Participant TR ID No", labelTR: "Katılımcı TC Kimlik No" },
      { key: "instructorName", labelEN: "Instructor Name", labelTR: "Eğitmen Adı" },
    ],
  },
  {
    id: "ingilizce_fen_bilimi_egitim_katilim_belgesi",
    nameTR: "İngilizce Fen Bilimi Eğitim Katılım Belgesi",
    nameEN: "English Science Education Participation Certificate",
    fields: [
      { key: "participantName", labelEN: "Participant Name & Surname", labelTR: "Katılımcı Adı ve Soyadı" },
      { key: "participantTrId", labelEN: "Participant TR ID No", labelTR: "Katılımcı TC Kimlik No" },
      { key: "educationDescription", labelEN: "Education Description:", labelTR: "Eğitim Açıklaması:" },
      { key: "educationStartEndDate", labelEN: "Education Start and Completion Date:", labelTR: "Eğitim Başlangıç ve Bitiş Tarihi:" },
      { key: "teacherName", labelEN: "Teacher Name Surname:", labelTR: "Öğretmen Adı Soyadı:" },
      { key: "principalName", labelEN: "Principal Name Surname:", labelTR: "Müdür Adı Soyadı:" },
      { key: "teacherSignature", labelEN: "Teacher Signature:", labelTR: "Öğretmen İmzası:" },
      { key: "principalSignature", labelEN: "Principal's Signature/Stamp:", labelTR: "Müdür İmzası/Mührü:" },
      { key: "date", labelEN: "Date:", labelTR: "Tarih:" },
    ],
    outcomeTemplateEN: "The participant has successfully engaged in the science education program and received a score of [Score] out of 100. Based on this result, their achievement level has been determined as [AchievementLevel].",
    outcomeTemplateTR: "Katılımcı, fen eğitimi programına başarıyla katıldı ve 100 üzerinden [Score] puan aldı. Bu sonuca göre, başarı seviyesi [AchievementLevel] olarak belirlendi.",
    not: "Puan / seviye kısmı doldurulmalı.",
  },
  {
    id: "ingilizce_matematik_egitim_katilim_belgesi",
    nameTR: "İngilizce Matematik Eğitim Katılım Belgesi",
    nameEN: "English Mathematics Education Participation Certificate",
    fields: [
      { key: "participantName", labelEN: "Participant Name & Surname", labelTR: "Katılımcı Adı ve Soyadı" },
      { key: "participantTrId", labelEN: "Participant TR ID No", labelTR: "Katılımcı TC Kimlik No" },
      { key: "educationDescription", labelEN: "Education Description:", labelTR: "Eğitim Açıklaması:" },
      { key: "educationStartEndDate", labelEN: "Education Start and Completion Date:", labelTR: "Eğitim Başlangıç ve Bitiş Tarihi:" },
      { key: "teacherName", labelEN: "Teacher Name Surname:", labelTR: "Öğretmen Adı Soyadı:" },
      { key: "principalName", labelEN: "Principal Name Surname:", labelTR: "Müdür Adı Soyadı:" },
      { key: "teacherSignature", labelEN: "Teacher Signature:", labelTR: "Öğretmen İmzası:" },
      { key: "principalSignature", labelEN: "Principal's Signature/Stamp:", labelTR: "Müdür İmzası/Mührü:" },
      { key: "date", labelEN: "Date:", labelTR: "Tarih:" },
    ],
    outcomeTemplateEN: "The participant has successfully engaged in the mathematics education program and received a score of [Score] out of 100. Based on this result, their achievement level has been determined as [AchievementLevel].",
    outcomeTemplateTR: "Katılımcı matematik eğitimi programına başarıyla katıldı ve 100 üzerinden [Score] puan aldı. Bu sonuca göre, başarı seviyesi [AchievementLevel] olarak belirlendi.",
    not: "Puan / seviye kısmı doldurulmalı.",
  },
  {
    id: "ingilizce_matematik_mufredat",
    nameTR: "İngilizce Matematik Müfredat",
    nameEN: "English Mathematics Curriculum",
    fields: [
      { key: "participantName", labelEN: "Participant Name & Surname", labelTR: "Katılımcı Adı ve Soyadı" },
      { key: "participantTrId", labelEN: "Participant TR ID No", labelTR: "Katılımcı TC Kimlik No" },
      { key: "instructorName", labelEN: "Instructor Name", labelTR: "Eğitmen Adı" },
    ],
  },
  {
    id: "konser_etkinligi_katilim_belgesi",
    nameTR: "Konser Etkinliği Katılım Belgesi",
    nameEN: "Concert Event Participation Certificate",
    fields: [
      { key: "participantName", labelEN: "Participant Name & Surname", labelTR: "Katılımcı Adı ve Soyadı" },
      { key: "participantTrId", labelEN: "Participant TR ID No", labelTR: "Katılımcı TC Kimlik No" },
      { key: "eventName", labelEN: "Event Name", labelTR: "Etkinlik Adı" },
      { key: "dateOfImplementation", labelEN: "Date of Implementation", labelTR: "Uygulama Tarihi" },
      { key: "numberOfParticipants", labelEN: "Number of Participants", labelTR: "Katılımcı Sayısı" },
      { key: "numberOfArtworks", labelEN: "Number of Artworks", labelTR: "Sanat Eseri Sayısı" },
      { key: "principalName", labelEN: "Principal Name Surname:", labelTR: "Müdür Adı Soyadı:" },
      { key: "vicePrincipalName", labelEN: "Vice Principal Name Surname:", labelTR: "Müdür Yardımcısı Adı Soyadı:" },
      { key: "principalSignature", labelEN: "Principal's Signature/Stamp:", labelTR: "Müdür İmzası/Mührü:" },
      { key: "vicePrincipalSignature", labelEN: "Vice Principal's Signature/Stamp:", labelTR: "Müdür Yardımcısı İmzası/Mührü:" },
      { key: "approvalDate", labelEN: "Approval Date:", labelTR: "Onay Tarihi:" },
    ],
  },
  {
    id: "muzik_akademik_egitim_belgesi_mufredat",
    nameTR: "Müzik Akademik Eğitim Belgesi (Müfredat)",
    nameEN: "Music Academic Education Certificate (Curriculum)",
    fields: [
      { key: "participantName", labelEN: "Participant Name & Surname", labelTR: "Katılımcı Adı ve Soyadı" },
      { key: "participantTrId", labelEN: "Participant TR ID No", labelTR: "Katılımcı TC Kimlik No" },
      { key: "instructorName", labelEN: "Instructor Name", labelTR: "Eğitmen Adı" },
    ],
  },
  {
    id: "piyano_egitimi_belgesi_mufredat",
    nameTR: "Piyano Eğitimi Belgesi (Müfredat)",
    nameEN: "Piano Education Certificate (Curriculum)",
    fields: [
      { key: "participantName", labelEN: "Participant Name & Surname", labelTR: "Katılımcı Adı ve Soyadı" },
      { key: "participantTrId", labelEN: "Participant TR ID No", labelTR: "Katılımcı TC Kimlik No" },
      { key: "instructorName", labelEN: "Instructor Name", labelTR: "Eğitmen Adı" },
    ],
  },
  {
    id: "proje_icerik_belgesi",
    nameTR: "Proje İçerik Belgesi",
    nameEN: "Project Content Document",
    fields: [
      { key: "projectTitle", labelEN: "Project Title", labelTR: "Proje Başlığı" },
      { key: "requestedBy", labelEN: "Requested By", labelTR: "Talep Eden" },
      { key: "participantName", labelEN: "Name & Surname", labelTR: "Adı ve Soyadı" },
      { key: "projectPurpose", labelEN: "Project Purpose", labelTR: "Proje Amacı" },
      { key: "participantTrId", labelEN: "Participant TR ID No", labelTR: "Katılımcı TR Kimlik Numarası" },
      { key: "projectDescription", labelEN: "Project Description", labelTR: "Proje Açıklaması" },
      { key: "participantRole", labelEN: "Participant's Role", labelTR: "Katılımcının Rolü" },
      { key: "expectedOutcomes", labelEN: "Expected Outcomes", labelTR: "Beklenen Kazanımlar" },
      { key: "principalName", labelEN: "Principal Name Surname:", labelTR: "Müdür Adı Soyadı:" },
      { key: "vicePrincipalName", labelEN: "Vice Principal Name Surname:", labelTR: "Müdür Yardımcısı Adı Soyadı:" },
      { key: "principalSignature", labelEN: "Principal's Signature/Stamp:", labelTR: "Müdür İmzası/Mührü:" },
      { key: "vicePrincipalSignature", labelEN: "Vice Principal's Signature/Stamp:", labelTR: "Müdür Yardımcısı İmzası/Mührü:" },
      { key: "approvalDate", labelEN: "Approval Date:", labelTR: "Onay Tarihi:" },
    ],
  },
  {
    id: "proje_katilim_belgesi",
    nameTR: "Proje Katılım Belgesi",
    nameEN: "Project Participation Certificate",
    fields: [
      { key: "participantName", labelEN: "Participant Name & Surname", labelTR: "Katılımcı Adı ve Soyadı" },
      { key: "participantTrId", labelEN: "Participant TR ID No", labelTR: "Katılımcı TC Kimlik No" },
      { key: "educationDescription", labelEN: "Education Description:", labelTR: "Eğitim Açıklaması:" },
      { key: "educationStartEndDate", labelEN: "Education Start and Completion Date:", labelTR: "Eğitim Başlangıç ve Bitiş Tarihi:" },
      { key: "teacherName", labelEN: "Teacher Name Surname:", labelTR: "Öğretmen Adı Soyadı:" },
      { key: "principalName", labelEN: "Principal Name Surname:", labelTR: "Müdür Adı Soyadı:" },
      { key: "teacherSignature", labelEN: "Teacher Signature:", labelTR: "Öğretmen İmzası:" },
      { key: "principalSignature", labelEN: "Principal's Signature/Stamp:", labelTR: "Müdür İmzası/Mührü:" },
      { key: "date", labelEN: "Date:", labelTR: "Tarih:" },
    ],
    outcomeTemplateEN: "Their contribution has been evaluated and determined to demonstrate a level of achievement rated as [AchievementLevel] within the project criteria.",
    outcomeTemplateTR: "Katkıları değerlendirilmiş ve proje kriterleri kapsamında [AchievementLevel] düzeyinde bir başarı sergilediği belirlenmiştir.",
    not: "Düzey (başarı seviyesi) belirtilmeli.",
  },
  {
    id: "basketbol_mufredat",
    nameTR: "Basketbol Müfredat",
    nameEN: "Basketball Curriculum",
    fields: [
      { key: "participantName", labelEN: "Participant Name & Surname", labelTR: "Katılımcı Adı ve Soyadı" },
      { key: "participantTrId", labelEN: "Participant TR ID No", labelTR: "Katılımcı TC Kimlik No" },
      { key: "instructorName", labelEN: "Instructor Name", labelTR: "Eğitmen Adı" },
    ],
  },
  {
    id: "beden_egitimi_mufredat",
    nameTR: "Beden Eğitimi Müfredat",
    nameEN: "Physical Education Curriculum",
    fields: [
      { key: "participantName", labelEN: "Participant Name & Surname", labelTR: "Katılımcı Adı ve Soyadı" },
      { key: "participantTrId", labelEN: "Participant TR ID No", labelTR: "Katılımcı TC Kimlik No" },
      { key: "instructorName", labelEN: "Instructor Name", labelTR: "Eğitmen Adı" },
    ],
  },
  {
    id: "dil_egitimi_katilim_belgesi",
    nameTR: "Dil Eğitimi Katılım Belgesi",
    nameEN: "Language Education Participation Certificate",
    fields: [
      { key: "participantName", labelEN: "Participant Name & Surname", labelTR: "Katılımcı Adı ve Soyadı" },
      { key: "participantTrId", labelEN: "Participant TR ID No", labelTR: "Katılımcı TC Kimlik No" },
      { key: "educationDescription", labelEN: "Education Description:", labelTR: "Eğitim Açıklaması:" },
      { key: "educationStartEndDate", labelEN: "Education Start and Completion Date:", labelTR: "Eğitim Başlangıç ve Bitiş Tarihi:" },
      { key: "teacherName", labelEN: "Teacher Name Surname:", labelTR: "Öğretmen Adı Soyadı:" },
      { key: "principalName", labelEN: "Principal Name Surname:", labelTR: "Müdür Adı Soyadı:" },
      { key: "teacherSignature", labelEN: "Teacher Signature:", labelTR: "Öğretmen İmzası:" },
      { key: "principalSignature", labelEN: "Principal's Signature/Stamp:", labelTR: "Müdür İmzası/Mührü:" },
      { key: "date", labelEN: "Date:", labelTR: "Tarih:" },
    ],
    outcomeTemplateEN: "The participant has successfully completed the language education program and achieved a score of [Score] out of 100. Based on this evaluation, their proficiency level has been determined as [AchievementLevel].",
    outcomeTemplateTR: "Katılımcı, dil eğitim programını başarıyla tamamlamış ve 100 üzerinden [Score] puan almıştır. Bu değerlendirmeye göre, dil yeterlilik seviyesi [AchievementLevel] olarak belirlenmiştir.",
    not: "Puan / seviye kısmı doldurulmalı.",
  },
  {
    id: "ingilizce_mufredat",
    nameTR: "İngilizce Müfredat",
    nameEN: "English Curriculum",
    fields: [
      { key: "participantName", labelEN: "Participant Name & Surname", labelTR: "Katılımcı Adı ve Soyadı" },
      { key: "participantTrId", labelEN: "Participant TR ID No", labelTR: "Katılımcı TC Kimlik No" },
      { key: "instructorName", labelEN: "Instructor Name", labelTR: "Eğitmen Adı" },
    ],
  },
  {
    id: "eser_icra_belgesi_muzik",
    nameTR: "Eser İcra Belgesi (Müzik)",
    nameEN: "Artwork Performance Certificate (Music)",
    fields: [
      { key: "participantName", labelEN: "Participant Name Surname:", labelTR: "Katılımcı Adı Soyadı:" },
      { key: "artworkDescription", labelEN: "Artwork Description:", labelTR: "Eser Açıklaması:" },
      { key: "participantTrId", labelEN: "Participant TR ID No:", labelTR: "Katılımcı TR Kimlik Numarası:" },
      { key: "artworkStartEndDate", labelEN: "Artwork Start and Completion Date:", labelTR: "Eser Başlangıç ve Bitiş Tarihi:" },
      { key: "teacherName", labelEN: "Teacher Name Surname:", labelTR: "Öğretmen Adı Soyadı:" },
      { key: "principalName", labelEN: "Principal Name Surname:", labelTR: "Müdür Adı Soyadı:" },
      { key: "teacherSignature", labelEN: "Teacher Signature:", labelTR: "Öğretmen İmzası:" },
      { key: "principalSignature", labelEN: "Principal's Signature/Stamp:", labelTR: "Müdür İmzası/Mührü:" },
      { key: "date", labelEN: "Date:", labelTR: "Tarih:" },
    ],
  },
  {
    id: "eser_icra_belgesi_resim",
    nameTR: "Eser İcra Belgesi (Resim)",
    nameEN: "Artwork Performance Certificate (Painting)",
    fields: [
      { key: "participantName", labelEN: "Participant Name Surname:", labelTR: "Katılımcı Adı Soyadı:" },
      { key: "artworkDescription", labelEN: "Artwork Description:", labelTR: "Eser Açıklaması:" },
      { key: "participantTrId", labelEN: "Participant TR ID No:", labelTR: "Katılımcı TR Kimlik Numarası:" },
      { key: "artworkStartEndDate", labelEN: "Artwork Start and Completion Date:", labelTR: "Eser Başlangıç ve Bitiş Tarihi:" },
      { key: "teacherName", labelEN: "Teacher Name Surname:", labelTR: "Öğretmen Adı Soyadı:" },
      { key: "principalName", labelEN: "Principal Name Surname:", labelTR: "Müdür Adı Soyadı:" },
      { key: "teacherSignature", labelEN: "Teacher Signature:", labelTR: "Öğretmen İmzası:" },
      { key: "principalSignature", labelEN: "Principal's Signature/Stamp:", labelTR: "Müdür İmzası/Mührü:" },
      { key: "date", labelEN: "Date:", labelTR: "Tarih:" },
    ],
  },
  {
    id: "gezi_katilim_belgesi",
    nameTR: "Gezi Katılım Belgesi",
    nameEN: "Trip Participation Certificate",
    fields: [
      { key: "participantName", labelEN: "Participant Name Surname:", labelTR: "Katılımcı Adı Soyadı:" },
      { key: "tripDescription", labelEN: "Trip Description:", labelTR: "Seyahat Açıklaması:" },
      { key: "participantTrId", labelEN: "Participant TR ID No:", labelTR: "Katılımcı TR Kimlik Numarası:" },
      { key: "tripStartEndDate", labelEN: "Trip Start and Completion Date:", labelTR: "Seyahat Başlangıç ve Bitiş Tarihi:" },
      { key: "teacherName", labelEN: "Teacher Name Surname:", labelTR: "Öğretmen Adı Soyadı:" },
      { key: "principalName", labelEN: "Principal Name Surname:", labelTR: "Müdür Adı Soyadı:" },
      { key: "teacherSignature", labelEN: "Teacher Signature:", labelTR: "Öğretmen İmzası:" },
      { key: "principalSignature", labelEN: "Principal's Signature/Stamp:", labelTR: "Müdür İmzası/Mührü:" },
      { key: "date", labelEN: "Date:", labelTR: "Tarih:" },
    ],
  },
  {
    id: "gorsel_sanatlar_mufredat",
    nameTR: "Görsel Sanatlar Müfredat",
    nameEN: "Visual Arts Curriculum",
    fields: [
      { key: "participantName", labelEN: "Participant Name & Surname", labelTR: "Katılımcı Adı ve Soyadı" },
      { key: "participantTrId", labelEN: "Participant TR ID No", labelTR: "Katılımcı TC Kimlik No" },
      { key: "instructorName", labelEN: "Instructor Name", labelTR: "Eğitmen Adı" },
    ],
  },
  {
    id: "gorsel_sanatlar_etkinlik_katilim_belgesi",
    nameTR: "Görsel Sanatlar Etkinlik Katılım Belgesi",
    nameEN: "Visual Arts Event Participation Certificate",
    fields: [
      { key: "participantName", labelEN: "Participant Name & Surname", labelTR: "Katılımcı Adı ve Soyadı" },
      { key: "participantTrId", labelEN: "Participant TR ID No", labelTR: "Katılımcı TC Kimlik No" },
      { key: "eventName", labelEN: "Event Name", labelTR: "Etkinlik Adı" },
      { key: "dateOfImplementation", labelEN: "Date of Implementation", labelTR: "Uygulama Tarihi" },
      { key: "numberOfParticipants", labelEN: "Number of Participants", labelTR: "Katılımcı Sayısı" },
      { key: "numberOfArtworks", labelEN: "Number of Artworks", labelTR: "Sanat Eseri Sayısı" },
      { key: "principalName", labelEN: "Principal Name Surname:", labelTR: "Müdür Adı Soyadı:" },
      { key: "vicePrincipalName", labelEN: "Vice Principal Name Surname:", labelTR: "Müdür Yardımcısı Adı Soyadı:" },
      { key: "principalSignature", labelEN: "Principal's Signature/Stamp:", labelTR: "Müdür İmzası/Mührü:" },
      { key: "vicePrincipalSignature", labelEN: "Vice Principal's Signature/Stamp:", labelTR: "Müdür Yardımcısı İmzası/Mührü:" },
      { key: "approvalDate", labelEN: "Approval Date:", labelTR: "Onay Tarihi:" },
    ],
  },
  {
    id: "hentbol_mufredat",
    nameTR: "Hentbol Müfredat",
    nameEN: "Handball Curriculum",
    fields: [
      { key: "participantName", labelEN: "Participant Name & Surname", labelTR: "Katılımcı Adı ve Soyadı" },
      { key: "participantTrId", labelEN: "Participant TR ID No", labelTR: "Katılımcı TC Kimlik No" },
      { key: "instructorName", labelEN: "Instructor Name", labelTR: "Eğitmen Adı" },
    ],
  },
  {
    id: "robotik_egitimi_katilim_belgesi",
    nameTR: "Robotik Eğitimi Katılım Belgesi",
    nameEN: "Robotics Education Participation Certificate",
    fields: [
      { key: "participantName", labelEN: "Participant Name & Surname", labelTR: "Katılımcı Adı ve Soyadı" },
      { key: "participantTrId", labelEN: "Participant TR ID No", labelTR: "Katılımcı TC Kimlik No" },
      { key: "educationDescription", labelEN: "Education Description:", labelTR: "Eğitim Açıklaması:" },
      { key: "educationStartEndDate", labelEN: "Education Start and Completion Date:", labelTR: "Eğitim Başlangıç ve Bitiş Tarihi:" },
      { key: "teacherName", labelEN: "Teacher Name Surname:", labelTR: "Öğretmen Adı Soyadı:" },
      { key: "principalName", labelEN: "Principal Name Surname:", labelTR: "Müdür Adı Soyadı:" },
      { key: "teacherSignature", labelEN: "Teacher Signature:", labelTR: "Öğretmen İmzası:" },
      { key: "principalSignature", labelEN: "Principal's Signature/Stamp:", labelTR: "Müdür İmzası/Mührü:" },
      { key: "date", labelEN: "Date:", labelTR: "Tarih:" },
    ],
    outcomeTemplateEN: "The participant has successfully engaged in the electronics and robotics education program and received a score of [Score] out of 100. Based on this result, their achievement level has been determined as [AchievementLevel].",
    outcomeTemplateTR: "Katılımcı, elektronik ve robotik eğitim programına başarıyla katıldı ve 100 üzerinden [Score] puan aldı. Bu sonuca göre, başarı seviyesi [AchievementLevel] olarak belirlendi.",
    not: "Puan / seviye kısmı doldurulmalı.",
  },
  {
    id: "robotik_mufredati",
    nameTR: "Robotik Müfredatı",
    nameEN: "Robotics Curriculum",
    fields: [
      { key: "participantName", labelEN: "Participant Name & Surname", labelTR: "Katılımcı Adı ve Soyadı" },
      { key: "participantTrId", labelEN: "Participant TR ID No", labelTR: "Katılımcı TC Kimlik No" },
      { key: "instructorName", labelEN: "Instructor Name", labelTR: "Eğitmen Adı" },
    ],
  },
  {
    id: "turnuva_basari_belgesi",
    nameTR: "Turnuva Başarı Belgesi",
    nameEN: "Tournament Achievement Certificate",
    fields: [
      { key: "participantName", labelEN: "Participant Name Surname:", labelTR: "Katılımcı Adı Soyadı:" },
      { key: "tournamentDescription", labelEN: "Tournament Description:", labelTR: "Turnuva Açıklaması:" },
      { key: "participantTrId", labelEN: "Participant TR ID No:", labelTR: "Katılımcı TR Kimlik Numarası:" },
      { key: "tournamentStartEndDate", labelEN: "Tournament Start and Completion Date:", labelTR: "Turnuva Başlangıç ve Bitiş Tarihi:" },
      { key: "teacherName", labelEN: "Teacher Name Surname:", labelTR: "Öğretmen Adı Soyadı:" },
      { key: "principalName", labelEN: "Principal Name Surname:", labelTR: "Müdür Adı Soyadı:" },
      { key: "teacherSignature", labelEN: "Teacher Signature:", labelTR: "Öğretmen İmzası:" },
      { key: "principalSignature", labelEN: "Principal's Signature/Stamp:", labelTR: "Müdür İmzası/Mührü:" },
      { key: "date", labelEN: "Date:", labelTR: "Tarih:" },
    ],
    outcomeTemplateEN: "The participant successfully achieved a [Place] place in the tournament, which was conducted with a total of [TotalParticipants] participants.",
    outcomeTemplateTR: "Katılımcı, toplam [TotalParticipants] katılımcının yer aldığı turnuvada [Place] sırada yer almayı başardı.",
    not: "Toplam katılımcı sayısı ve sıralama doldurulmalı.",
  },
  {
    id: "turnuva_katilim_belgesi",
    nameTR: "Turnuva Katılım Belgesi",
    nameEN: "Tournament Participation Certificate",
    fields: [
      { key: "participantName", labelEN: "Participant Name Surname:", labelTR: "Katılımcı Adı Soyadı:" },
      { key: "tournamentDescription", labelEN: "Tournament Description:", labelTR: "Turnuva Açıklaması:" },
      { key: "participantTrId", labelEN: "Participant TR ID No:", labelTR: "Katılımcı TR Kimlik Numarası:" },
      { key: "tournamentStartEndDate", labelEN: "Tournament Start and Completion Date:", labelTR: "Turnuva Başlangıç ve Bitiş Tarihi:" },
      { key: "teacherName", labelEN: "Teacher Name Surname:", labelTR: "Öğretmen Adı Soyadı:" },
      { key: "principalName", labelEN: "Principal Name Surname:", labelTR: "Müdür Adı Soyadı:" },
      { key: "teacherSignature", labelEN: "Teacher Signature:", labelTR: "Öğretmen İmzası:" },
      { key: "principalSignature", labelEN: "Principal's Signature/Stamp:", labelTR: "Müdür İmzası/Mührü:" },
      { key: "date", labelEN: "Date:", labelTR: "Tarih:" },
    ],
  },
  {
    id: "voleybol_mufredat",
    nameTR: "Voleybol Müfredat",
    nameEN: "Volleyball Curriculum",
    fields: [
      { key: "participantName", labelEN: "Participant Name & Surname", labelTR: "Katılımcı Adı ve Soyadı" },
      { key: "participantTrId", labelEN: "Participant TR ID No", labelTR: "Katılımcı TC Kimlik No" },
      { key: "instructorName", labelEN: "Instructor Name", labelTR: "Eğitmen Adı" },
    ],
  },
  {
    id: "yapay_zeka_mufredat",
    nameTR: "Yapay Zeka Müfredat",
    nameEN: "Artificial Intelligence Curriculum",
    fields: [
      { key: "participantName", labelEN: "Participant Name & Surname", labelTR: "Katılımcı Adı ve Soyadı" },
      { key: "participantTrId", labelEN: "Participant TR ID No", labelTR: "Katılımcı TC Kimlik No" },
      { key: "instructorName", labelEN: "Instructor Name", labelTR: "Eğitmen Adı" },
    ],
  },
  {
    id: "yapay_zeka_egitimi_katilim_belgesi",
    nameTR: "Yapay Zeka Eğitimi Katılım Belgesi",
    nameEN: "Artificial Intelligence Education Participation Certificate",
    fields: [
      { key: "participantName", labelEN: "Participant Name & Surname", labelTR: "Katılımcı Adı ve Soyadı" },
      { key: "participantTrId", labelEN: "Participant TR ID No", labelTR: "Katılımcı TC Kimlik No" },
      { key: "educationDescription", labelEN: "Education Description:", labelTR: "Eğitim Açıklaması:" },
      { key: "educationStartEndDate", labelEN: "Education Start and Completion Date:", labelTR: "Eğitim Başlangıç ve Bitiş Tarihi:" },
      { key: "teacherName", labelEN: "Teacher Name Surname:", labelTR: "Öğretmen Adı Soyadı:" },
      { key: "principalName", labelEN: "Principal Name Surname:", labelTR: "Müdür Adı Soyadı:" },
      { key: "teacherSignature", labelEN: "Teacher Signature:", labelTR: "Öğretmen İmzası:" },
      { key: "principalSignature", labelEN: "Principal's Signature/Stamp:", labelTR: "Müdür İmzası/Mührü:" },
      { key: "date", labelEN: "Date:", labelTR: "Tarih:" },
    ],
    outcomeTemplateEN: "The participant has successfully engaged in the artificial intelligence education program and received a score of [Score] out of 100. Based on this result, their achievement level has been determined as [AchievementLevel].",
    outcomeTemplateTR: "Katılımcı, yapay zeka eğitim programına başarıyla katıldı ve 100 üzerinden [Score] puan aldı. Bu sonuca göre, başarı seviyesi [AchievementLevel] olarak belirlendi.",
    not: "Puan / seviye kısmı doldurulmalı.",
  },
]

/** Belge id ile tanım bul */
export function getBelgeTanimi(id: string): BelgeTanimi | undefined {
  return IB_BELGE_TANIMLARI.find((b) => b.id === id)
}

/** Outcome şablonundaki placeholder'ları doldur */
export function fillOutcomeTemplate(
  template: string,
  values: { Score?: number; AchievementLevel?: string; Place?: string; TotalParticipants?: number }
): string {
  let out = template
  if (values.Score !== undefined) out = out.replace(/\[Score\]/g, String(values.Score))
  if (values.AchievementLevel !== undefined) out = out.replace(/\[AchievementLevel\]/g, values.AchievementLevel)
  if (values.Place !== undefined) out = out.replace(/\[Place\]/g, values.Place)
  if (values.TotalParticipants !== undefined) out = out.replace(/\[TotalParticipants\]/g, String(values.TotalParticipants))
  return out
}
