import { cookies } from "next/headers";
import AdminSidebar from "./admin-sidebar";
import AdminLogin from "./admin-login";

async function isAuthenticated() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  return token === process.env.ADMIN_PASSWORD;
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    return <AdminLogin />;
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <AdminSidebar />
      <main className="ml-[280px]">
        {children}
      </main>
    </div>
  );
}
