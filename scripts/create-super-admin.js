/**
 * Süper Admin Oluşturma Scripti
 * 
 * Kullanım: node scripts/create-super-admin.js
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Süper Admin oluşturuluyor...\n");

  // Mevcut Süper Admin kontrolü
  const existingAdmin = await prisma.staff.findFirst({
    where: { department: "SUPER_ADMIN" },
  });

  if (existingAdmin) {
    console.log("⚠️  Süper Admin zaten mevcut!");
    console.log(`📋 TC No: ${existingAdmin.tcNumber}`);
    console.log(`👤 Ad Soyad: ${existingAdmin.firstName} ${existingAdmin.lastName}`);
    console.log("\n💡 İlk giriş şifresi TC Kimlik numarasıdır.");
    return;
  }

  // Süper Admin oluştur
  const superAdmin = await prisma.staff.create({
    data: {
      firstName: "Sistem",
      lastName: "Yöneticisi",
      tcNumber: "99999999999", // Özel TC No
      email: "admin@leventkolej.com",
      phone: "0555 555 5555",
      department: "SUPER_ADMIN",
      position: "Sistem Yöneticisi",
      isActive: true,
      hireDate: new Date(),
      password: null, // İlk giriş için null
      isFirstLogin: true,
      mustChangePassword: true,
    },
  });

  console.log("✅ Süper Admin başarıyla oluşturuldu!\n");
  console.log("📋 Giriş Bilgileri:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`👤 Ad Soyad: ${superAdmin.firstName} ${superAdmin.lastName}`);
  console.log(`🆔 TC Kimlik No: ${superAdmin.tcNumber}`);
  console.log(`🔑 İlk Giriş Şifresi: ${superAdmin.tcNumber}`);
  console.log(`📧 Email: ${superAdmin.email}`);
  console.log(`📞 Telefon: ${superAdmin.phone}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  console.log("⚠️  ÖNEMLI:");
  console.log("1. İlk girişte TC Kimlik numaranızı şifre olarak kullanın");
  console.log("2. Sistem sizi şifre değiştirme ekranına yönlendirecek");
  console.log("3. Güçlü bir şifre belirleyin\n");
}

main()
  .catch((e) => {
    console.error("❌ Hata:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

