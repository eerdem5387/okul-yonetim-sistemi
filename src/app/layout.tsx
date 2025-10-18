import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Sidebar } from "@/components/layout/sidebar"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Okul Yönetim Sistemi",
  description: "Öğrenci kayıt ve sözleşme yönetim sistemi",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr">
      <body className={inter.className}>
        <div className="flex h-screen bg-gray-100">
          <Sidebar />
          <main className="flex-1 overflow-y-auto lg:ml-0 ml-0">
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 p-4">
              <h1 className="text-lg font-bold" style={{ color: 'var(--primary-dark)' }}>Okul Yönetim Sistemi</h1>
            </div>
            <div className="lg:pt-0 pt-16">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  )
}