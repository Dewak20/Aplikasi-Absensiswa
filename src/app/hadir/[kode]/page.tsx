import { StudentAttendance } from "@/components/student-attendance";

export const instant = false;

export function generateStaticParams() {
  return [{ kode: "MTK-9J-241" }];
}

export default async function StudentAttendancePage({
  params,
}: {
  params: Promise<{ kode: string }>;
}) {
  const { kode } = await params;

  return <StudentAttendance sessionCode={decodeURIComponent(kode).toUpperCase()} />;
}
