import { db } from "@/lib/db";
import { users, messages, feedback } from "@/lib/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import Link from "next/link";

type UserWithStats = {
  id: string;
  email: string;
  group: string;
  createdAt: Date;
  messageCount: number;
  thumbsUp: number;
  thumbsDown: number;
};

async function getUsers(): Promise<UserWithStats[]> {
  const userList = await db
    .select({
      id: users.id,
      email: users.email,
      group: users.group,
      createdAt: users.createdAt,
      messageCount: sql<number>`count(distinct ${messages.id})`,
      thumbsUp: sql<number>`count(*) filter (where ${feedback.rating} = 'up')`,
      thumbsDown: sql<number>`count(*) filter (where ${feedback.rating} = 'down')`,
    })
    .from(users)
    .leftJoin(messages, eq(messages.userId, users.id))
    .leftJoin(feedback, eq(feedback.userId, users.id))
    .groupBy(users.id, users.email, users.group, users.createdAt)
    .orderBy(desc(users.createdAt));

  return userList;
}

export default async function UsersPage() {
  const userList = await getUsers();

  const krokyoCount = userList.filter((u) => u.group === "krokyo").length;
  const controlCount = userList.filter((u) => u.group === "control").length;

  return (
    <div className="p-8">
      <div className="max-w-6xl">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-stone-900 tracking-tight">Users</h1>
          <p className="text-stone-500 mt-1">Manage study participants and their data</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-stone-200 shadow-soft-sm p-5">
            <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Total Users</p>
            <p className="text-3xl font-bold text-stone-900">{userList.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 shadow-soft-sm p-5">
            <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Krokyo Group</p>
            <p className="text-3xl font-bold text-teal-600">{krokyoCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 shadow-soft-sm p-5">
            <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Control Group</p>
            <p className="text-3xl font-bold text-violet-600">{controlCount}</p>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-soft-sm overflow-hidden">
          {userList.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50">
                  <th className="text-left py-4 px-6 text-xs text-stone-500 font-semibold uppercase tracking-wider">ID</th>
                  <th className="text-left py-4 px-6 text-xs text-stone-500 font-semibold uppercase tracking-wider">Email</th>
                  <th className="text-left py-4 px-6 text-xs text-stone-500 font-semibold uppercase tracking-wider">Group</th>
                  <th className="text-left py-4 px-6 text-xs text-stone-500 font-semibold uppercase tracking-wider">Messages</th>
                  <th className="text-left py-4 px-6 text-xs text-stone-500 font-semibold uppercase tracking-wider">Feedback</th>
                  <th className="text-left py-4 px-6 text-xs text-stone-500 font-semibold uppercase tracking-wider">Joined</th>
                  <th className="text-left py-4 px-6 text-xs text-stone-500 font-semibold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {userList.map((user) => (
                  <tr key={user.id} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                    <td className="py-4 px-6">
                      <p className="font-mono text-xs text-stone-600">{user.id.slice(0, 8)}...</p>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-sm text-stone-700 truncate max-w-[200px]">{user.email}</p>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        user.group === "krokyo"
                          ? "bg-teal-100 text-teal-700"
                          : "bg-violet-100 text-violet-700"
                      }`}>
                        {user.group}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-semibold text-stone-900">{user.messageCount}</span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-emerald-600 font-medium">{user.thumbsUp}</span>
                        <span className="text-stone-300">/</span>
                        <span className="text-red-500 font-medium">{user.thumbsDown}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-stone-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
                      >
                        View Profile
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12 text-stone-500">
              No users yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
