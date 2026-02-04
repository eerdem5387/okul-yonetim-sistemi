#!/usr/bin/env node
/**
 * Tek bir personelin şifresini günceller (Neon/Prisma).
 * Kullanım: node scripts/update-staff-password.js <tcNumber> <yeniŞifre>
 * Örnek:   node scripts/update-staff-password.js 12345678901 YeniSifre123
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log("Kullanım: node scripts/update-staff-password.js <tcNumber> <yeniŞifre>");
    console.log("Örnek:   node scripts/update-staff-password.js 12345678901 YeniSifre123");
    process.exit(1);
  }

  const tcNumber = args[0];
  const newPassword = args[1];

  const staff = await prisma.staff.findUnique({
    where: { tcNumber },
    select: { id: true, firstName: true, lastName: true, tcNumber: true },
  });

  if (!staff) {
    console.error("Bu TC numarasına sahip personel bulunamadı:", tcNumber);
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.staff.update({
    where: { id: staff.id },
    data: {
      password: hashedPassword,
      isFirstLogin: false,
      mustChangePassword: false,
    },
  });

  console.log("Şifre güncellendi:", staff.firstName, staff.lastName, "(TC:", staff.tcNumber + ")");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
