import { redirect } from "next/navigation"

/** Eski adres; tek giriş noktası /faaliyet-ekle */
export default function YeniFaaliyetiRedirectPage() {
  redirect("/faaliyet-ekle")
}
