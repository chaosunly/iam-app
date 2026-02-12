import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CompleteProfileForm } from "./complete-profile-form";

export default async function CompleteProfilePage() {
  const cookieStore = await cookies();
  const pendingUserCookie = cookieStore.get("pending_simplelogin_user");

  if (!pendingUserCookie) {
    redirect("/auth/login");
  }

  const userData = JSON.parse(pendingUserCookie.value);

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-md space-y-6 p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Complete Your Profile</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            We successfully authenticated you with SimpleLogin
          </p>
        </div>

        <CompleteProfileForm userData={userData} />
      </div>
    </div>
  );
}
