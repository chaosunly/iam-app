import { redirect } from "next/navigation";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ flow?: string }>;
}) {
  const params = await searchParams;
  if (params.flow) {
    redirect(`/dashboard/settings/profile?flow=${params.flow}`);
  }
  redirect("/dashboard/settings/profile");
}
