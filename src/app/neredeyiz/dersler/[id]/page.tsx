import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export default async function LegacySubjectPlanRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const subject = await prisma.subject.findUnique({
    where: { id },
    select: { classId: true },
  })
  if (!subject?.classId) redirect("/neredeyiz/sinif")
  redirect(`/neredeyiz/sinif/${subject.classId}?subjectId=${id}`)
}
