"use client";

type Stats = {
  users: { total: number; krokyo: number; control: number };
  messages: { total: number; userMessages: number; assistantMessages: number };
  feedback: { total: number; thumbsUp: number; thumbsDown: number };
  feedbackByGroup: Array<{ group: string; thumbsUp: number; thumbsDown: number }>;
  messagesPerUserByGroup: Array<{
    group: string;
    avgMessages: number;
    totalUsers: number;
    totalMessages: number;
  }>;
  responseTimeByGroup: Array<{ group: string; avgResponseTime: number }>;
  dailyActivity: Array<{ date: string; count: number }>;
  recentUsers: Array<{
    id: string;
    group: string;
    createdAt: Date;
    messageCount: number;
  }>;
};

function BarChart({
  data,
  maxValue,
  label,
}: {
  data: { label: string; value: number; color: string }[];
  maxValue: number;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      {data.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span className="text-xs text-gray-600 w-16">{item.label}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
            <div
              className={`h-full rounded-full ${item.color}`}
              style={{ width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs font-medium text-gray-700 w-8 text-right">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function MiniLineChart({ data }: { data: Array<{ date: string; count: number }> }) {
  if (data.length === 0) {
    return <div className="text-sm text-gray-400 text-center py-4">No activity yet</div>;
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const points = data
    .map((d, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * 100;
      const y = 100 - (d.count / maxCount) * 80;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="relative">
      <svg viewBox="0 0 100 100" className="w-full h-24" preserveAspectRatio="none">
        <polyline
          points={points}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        {data.map((d, i) => {
          const x = (i / Math.max(data.length - 1, 1)) * 100;
          const y = 100 - (d.count / maxCount) * 80;
          return <circle key={i} cx={x} cy={y} r="3" fill="#3b82f6" vectorEffect="non-scaling-stroke" />;
        })}
      </svg>
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        {data.map((d, i) => (
          <span key={i}>{d.date}</span>
        ))}
      </div>
    </div>
  );
}

function SatisfactionGauge({ thumbsUp, thumbsDown }: { thumbsUp: number; thumbsDown: number }) {
  const total = thumbsUp + thumbsDown;
  const percentage = total > 0 ? Math.round((thumbsUp / total) * 100) : 0;
  const angle = (percentage / 100) * 180 - 90;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-16 overflow-hidden">
        <svg viewBox="0 0 100 50" className="w-full">
          {/* Background arc */}
          <path d="M 5 50 A 45 45 0 0 1 95 50" fill="none" stroke="#e5e7eb" strokeWidth="8" strokeLinecap="round" />
          {/* Colored arc */}
          <path
            d="M 5 50 A 45 45 0 0 1 95 50"
            fill="none"
            stroke={percentage >= 70 ? "#22c55e" : percentage >= 40 ? "#eab308" : "#ef4444"}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${(percentage / 100) * 141.4} 141.4`}
          />
          {/* Needle */}
          <line
            x1="50"
            y1="50"
            x2={50 + 35 * Math.cos((angle * Math.PI) / 180)}
            y2={50 - 35 * Math.sin((angle * Math.PI) / 180)}
            stroke="#374151"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="50" cy="50" r="4" fill="#374151" />
        </svg>
      </div>
      <p className="text-2xl font-bold text-gray-900">{percentage}%</p>
      <p className="text-xs text-gray-500">Satisfaction Rate</p>
    </div>
  );
}

function ExportButtons() {
  const handleExport = (type: string) => {
    window.open(`/api/admin/export?type=${type}`, "_blank");
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => handleExport("all")}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export All (CSV)
      </button>
      <button
        onClick={() => handleExport("users")}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
      >
        Users
      </button>
      <button
        onClick={() => handleExport("messages")}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
      >
        Messages
      </button>
      <button
        onClick={() => handleExport("feedback")}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
      >
        Feedback
      </button>
    </div>
  );
}

export default function AdminDashboard({ stats }: { stats: Stats }) {
  const krokyoFeedback = stats.feedbackByGroup.find((f) => f.group === "krokyo");
  const controlFeedback = stats.feedbackByGroup.find((f) => f.group === "control");

  const krokyoMessages = stats.messagesPerUserByGroup.find((m) => m.group === "krokyo");
  const controlMessages = stats.messagesPerUserByGroup.find((m) => m.group === "control");

  const krokyoResponseTime = stats.responseTimeByGroup.find((r) => r.group === "krokyo");
  const controlResponseTime = stats.responseTimeByGroup.find((r) => r.group === "control");

  const krokyoSatisfaction =
    krokyoFeedback && krokyoFeedback.thumbsUp + krokyoFeedback.thumbsDown > 0
      ? Math.round((krokyoFeedback.thumbsUp / (krokyoFeedback.thumbsUp + krokyoFeedback.thumbsDown)) * 100)
      : null;
  const controlSatisfaction =
    controlFeedback && controlFeedback.thumbsUp + controlFeedback.thumbsDown > 0
      ? Math.round((controlFeedback.thumbsUp / (controlFeedback.thumbsUp + controlFeedback.thumbsDown)) * 100)
      : null;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Stats 101 Admin</h1>
            <span className="text-sm text-gray-500">Experiment Dashboard</span>
          </div>
          <ExportButtons />
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <p className="text-sm text-gray-500 mb-1">Total Participants</p>
            <p className="text-3xl font-bold text-gray-900">{stats.users.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <p className="text-sm text-gray-500 mb-1">Questions Asked</p>
            <p className="text-3xl font-bold text-gray-900">{stats.messages.userMessages}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <p className="text-sm text-gray-500 mb-1">Total Feedback</p>
            <p className="text-3xl font-bold text-gray-900">{stats.feedback.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <p className="text-sm text-gray-500 mb-1">Overall Satisfaction</p>
            <p className="text-3xl font-bold text-gray-900">
              {stats.feedback.total > 0
                ? `${Math.round((stats.feedback.thumbsUp / stats.feedback.total) * 100)}%`
                : "—"}
            </p>
          </div>
        </div>

        {/* Group Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Krokyo Group */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <h2 className="text-lg font-semibold text-gray-900">Krokyo (Socratic)</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-500 uppercase">Participants</p>
                <p className="text-2xl font-bold text-gray-900">{stats.users.krokyo}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Avg Questions</p>
                <p className="text-2xl font-bold text-gray-900">{krokyoMessages?.avgMessages || 0}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Response Time</p>
                <p className="text-2xl font-bold text-gray-900">
                  {krokyoResponseTime?.avgResponseTime
                    ? `${Math.round(krokyoResponseTime.avgResponseTime / 1000)}s`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Satisfaction</p>
                <p
                  className={`text-2xl font-bold ${
                    krokyoSatisfaction !== null && krokyoSatisfaction >= 70
                      ? "text-green-600"
                      : krokyoSatisfaction !== null && krokyoSatisfaction >= 40
                      ? "text-yellow-600"
                      : "text-gray-900"
                  }`}
                >
                  {krokyoSatisfaction !== null ? `${krokyoSatisfaction}%` : "—"}
                </p>
              </div>
            </div>
            <div className="flex gap-2 text-sm">
              <span className="inline-flex items-center gap-1 text-green-600">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
                {krokyoFeedback?.thumbsUp || 0}
              </span>
              <span className="inline-flex items-center gap-1 text-red-600">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                </svg>
                {krokyoFeedback?.thumbsDown || 0}
              </span>
            </div>
          </div>

          {/* Control Group */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <h2 className="text-lg font-semibold text-gray-900">Control (Direct)</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-500 uppercase">Participants</p>
                <p className="text-2xl font-bold text-gray-900">{stats.users.control}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Avg Questions</p>
                <p className="text-2xl font-bold text-gray-900">{controlMessages?.avgMessages || 0}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Response Time</p>
                <p className="text-2xl font-bold text-gray-900">
                  {controlResponseTime?.avgResponseTime
                    ? `${Math.round(controlResponseTime.avgResponseTime / 1000)}s`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Satisfaction</p>
                <p
                  className={`text-2xl font-bold ${
                    controlSatisfaction !== null && controlSatisfaction >= 70
                      ? "text-green-600"
                      : controlSatisfaction !== null && controlSatisfaction >= 40
                      ? "text-yellow-600"
                      : "text-gray-900"
                  }`}
                >
                  {controlSatisfaction !== null ? `${controlSatisfaction}%` : "—"}
                </p>
              </div>
            </div>
            <div className="flex gap-2 text-sm">
              <span className="inline-flex items-center gap-1 text-green-600">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
                {controlFeedback?.thumbsUp || 0}
              </span>
              <span className="inline-flex items-center gap-1 text-red-600">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                </svg>
                {controlFeedback?.thumbsDown || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Participants Bar */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Group Distribution</h3>
            <BarChart
              label="Participants"
              maxValue={Math.max(stats.users.krokyo, stats.users.control, 1)}
              data={[
                { label: "Krokyo", value: stats.users.krokyo, color: "bg-blue-500" },
                { label: "Control", value: stats.users.control, color: "bg-purple-500" },
              ]}
            />
          </div>

          {/* Overall Satisfaction Gauge */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-4 text-center">Overall Satisfaction</h3>
            <SatisfactionGauge thumbsUp={stats.feedback.thumbsUp} thumbsDown={stats.feedback.thumbsDown} />
          </div>

          {/* Activity Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Messages (Last 7 Days)</h3>
            <MiniLineChart data={stats.dailyActivity} />
          </div>
        </div>

        {/* Recent Participants Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Participants</h3>
          {stats.recentUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">ID</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Group</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Questions</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentUsers.map((user) => (
                    <tr key={user.id} className="border-b border-gray-100">
                      <td className="py-2 px-3 font-mono text-xs text-gray-600">{user.id.slice(0, 8)}...</td>
                      <td className="py-2 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            user.group === "krokyo" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                          }`}
                        >
                          {user.group}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-gray-900">{user.messageCount}</td>
                      <td className="py-2 px-3 text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No participants yet</p>
          )}
        </div>

        {/* Experiment Info */}
        <div className="bg-gray-100 rounded-lg p-6 mt-8">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Experiment Design</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <p>
                <span className="font-medium">Type:</span> Between-subjects A/B test
              </p>
              <p>
                <span className="font-medium">Assignment:</span> Random 50/50 split via localStorage
              </p>
            </div>
            <div>
              <p>
                <span className="font-medium text-blue-600">Krokyo:</span> Socratic method (asks questions first)
              </p>
              <p>
                <span className="font-medium text-purple-600">Control:</span> Direct answers (complete explanations)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
