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
  techMetrics: {
    replyRate: number;
    avgResponseTime: number;
    p95ResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
  };
  productMetrics: {
    totalSessions: number;
    avgSessionDuration: number;
    avgMessagesPerSession: number;
    totalSessionTime: number;
    retentionD1: number;
    retentionD7: number;
    dropOffRate: number;
    bounceRate: number;
    feedbackRate: number;
  };
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
    <div className="space-y-3">
      <p className="text-xs text-stone-500 font-semibold uppercase tracking-wider">{label}</p>
      {data.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="text-xs text-stone-600 w-16 font-medium">{item.label}</span>
          <div className="flex-1 bg-stone-100 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${item.color}`}
              style={{ width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-stone-700 w-8 text-right">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function MiniLineChart({ data }: { data: Array<{ date: string; count: number }> }) {
  if (data.length === 0) {
    return <div className="text-sm text-stone-400 text-center py-6">No activity yet</div>;
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
      <svg viewBox="0 0 100 100" className="w-full h-28" preserveAspectRatio="none">
        <polyline
          points={points}
          fill="none"
          stroke="#0F766E"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        {data.map((d, i) => {
          const x = (i / Math.max(data.length - 1, 1)) * 100;
          const y = 100 - (d.count / maxCount) * 80;
          return <circle key={i} cx={x} cy={y} r="4" fill="#0F766E" vectorEffect="non-scaling-stroke" />;
        })}
      </svg>
      <div className="flex justify-between text-xs text-stone-400 mt-2 font-medium">
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
      <div className="relative w-36 h-18 overflow-hidden">
        <svg viewBox="0 0 100 50" className="w-full">
          <path d="M 5 50 A 45 45 0 0 1 95 50" fill="none" stroke="#E7E5E4" strokeWidth="8" strokeLinecap="round" />
          <path
            d="M 5 50 A 45 45 0 0 1 95 50"
            fill="none"
            stroke={percentage >= 70 ? "#10B981" : percentage >= 40 ? "#F59E0B" : "#EF4444"}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${(percentage / 100) * 141.4} 141.4`}
          />
          <line
            x1="50"
            y1="50"
            x2={50 + 35 * Math.cos((angle * Math.PI) / 180)}
            y2={50 - 35 * Math.sin((angle * Math.PI) / 180)}
            stroke="#1C1917"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="50" cy="50" r="4" fill="#1C1917" />
        </svg>
      </div>
      <p className="text-3xl font-bold text-stone-900 mt-2">{percentage}%</p>
      <p className="text-xs text-stone-500 font-medium">Satisfaction Rate</p>
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
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary-gradient text-white text-sm font-semibold rounded-lg transition-all hover:shadow-lg"
        style={{ boxShadow: '0 2px 8px rgba(15, 118, 110, 0.25)' }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export All (CSV)
      </button>
      <button
        onClick={() => handleExport("users")}
        className="inline-flex items-center gap-2 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-medium rounded-lg transition-colors"
      >
        Users
      </button>
      <button
        onClick={() => handleExport("messages")}
        className="inline-flex items-center gap-2 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-medium rounded-lg transition-colors"
      >
        Messages
      </button>
      <button
        onClick={() => handleExport("feedback")}
        className="inline-flex items-center gap-2 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-medium rounded-lg transition-colors"
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
    <div className="p-8">
      <div className="max-w-6xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="font-display text-3xl font-bold text-stone-900 tracking-tight">Krokyo Admin</h1>
            <span className="text-sm text-stone-500">Experiment Dashboard</span>
          </div>
          <ExportButtons />
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-10">
          <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-soft-sm">
            <p className="text-sm text-stone-500 mb-2 font-medium">Unique Students</p>
            <p className="text-4xl font-bold text-stone-900">{stats.users.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-soft-sm">
            <p className="text-sm text-stone-500 mb-2 font-medium">Total Sessions</p>
            <p className="text-4xl font-bold text-stone-900">{stats.productMetrics.totalSessions}</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-soft-sm">
            <p className="text-sm text-stone-500 mb-2 font-medium">Questions Asked</p>
            <p className="text-4xl font-bold text-stone-900">{stats.messages.userMessages}</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-soft-sm">
            <p className="text-sm text-stone-500 mb-2 font-medium">Overall Satisfaction</p>
            <p className="text-4xl font-bold text-stone-900">
              {stats.feedback.total > 0
                ? `${Math.round((stats.feedback.thumbsUp / stats.feedback.total) * 100)}%`
                : "—"}
            </p>
          </div>
        </div>

        {/* Tech Metrics */}
        <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-soft-sm mb-6">
          <h2 className="font-display text-lg font-semibold text-stone-900 mb-5 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
            Tech Metrics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div>
              <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Reply Rate</p>
              <p className={`text-2xl font-bold ${stats.techMetrics.replyRate >= 95 ? 'text-emerald-600' : stats.techMetrics.replyRate >= 80 ? 'text-amber-600' : 'text-red-500'}`}>
                {stats.techMetrics.replyRate}%
              </p>
              <p className="text-xs text-stone-400">% user msgs with response</p>
            </div>
            <div>
              <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Avg Response</p>
              <p className="text-2xl font-bold text-stone-900">
                {stats.techMetrics.avgResponseTime ? `${(stats.techMetrics.avgResponseTime / 1000).toFixed(1)}s` : '—'}
              </p>
              <p className="text-xs text-stone-400">mean response time</p>
            </div>
            <div>
              <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">P95 Response</p>
              <p className={`text-2xl font-bold ${stats.techMetrics.p95ResponseTime < 10000 ? 'text-emerald-600' : stats.techMetrics.p95ResponseTime < 20000 ? 'text-amber-600' : 'text-red-500'}`}>
                {stats.techMetrics.p95ResponseTime ? `${(stats.techMetrics.p95ResponseTime / 1000).toFixed(1)}s` : '—'}
              </p>
              <p className="text-xs text-stone-400">95th percentile</p>
            </div>
            <div>
              <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Min Response</p>
              <p className="text-2xl font-bold text-stone-900">
                {stats.techMetrics.minResponseTime ? `${(stats.techMetrics.minResponseTime / 1000).toFixed(1)}s` : '—'}
              </p>
              <p className="text-xs text-stone-400">fastest response</p>
            </div>
            <div>
              <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Max Response</p>
              <p className="text-2xl font-bold text-stone-900">
                {stats.techMetrics.maxResponseTime ? `${(stats.techMetrics.maxResponseTime / 1000).toFixed(1)}s` : '—'}
              </p>
              <p className="text-xs text-stone-400">slowest response</p>
            </div>
          </div>
        </div>

        {/* Product Metrics */}
        <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-soft-sm mb-10">
          <h2 className="font-display text-lg font-semibold text-stone-900 mb-5 flex items-center gap-2">
            <svg className="w-5 h-5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Product Metrics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <div>
              <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Avg Session</p>
              <p className="text-2xl font-bold text-stone-900">
                {stats.productMetrics.avgSessionDuration.toFixed(1)}m
              </p>
              <p className="text-xs text-stone-400">duration in minutes</p>
            </div>
            <div>
              <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Msgs/Session</p>
              <p className="text-2xl font-bold text-stone-900">
                {stats.productMetrics.avgMessagesPerSession.toFixed(1)}
              </p>
              <p className="text-xs text-stone-400">messages per session</p>
            </div>
            <div>
              <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Total Time</p>
              <p className="text-2xl font-bold text-stone-900">
                {stats.productMetrics.totalSessionTime > 60
                  ? `${(stats.productMetrics.totalSessionTime / 60).toFixed(1)}h`
                  : `${stats.productMetrics.totalSessionTime.toFixed(0)}m`}
              </p>
              <p className="text-xs text-stone-400">all sessions combined</p>
            </div>
            <div>
              <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Retention D1</p>
              <p className={`text-2xl font-bold ${stats.productMetrics.retentionD1 >= 30 ? 'text-emerald-600' : stats.productMetrics.retentionD1 >= 15 ? 'text-amber-600' : 'text-red-500'}`}>
                {stats.productMetrics.retentionD1}%
              </p>
              <p className="text-xs text-stone-400">returned next day</p>
            </div>
            <div>
              <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Retention D7</p>
              <p className={`text-2xl font-bold ${stats.productMetrics.retentionD7 >= 20 ? 'text-emerald-600' : stats.productMetrics.retentionD7 >= 10 ? 'text-amber-600' : 'text-red-500'}`}>
                {stats.productMetrics.retentionD7}%
              </p>
              <p className="text-xs text-stone-400">returned after 7 days</p>
            </div>
            <div>
              <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Drop-off</p>
              <p className={`text-2xl font-bold ${stats.productMetrics.dropOffRate <= 50 ? 'text-emerald-600' : stats.productMetrics.dropOffRate <= 70 ? 'text-amber-600' : 'text-red-500'}`}>
                {stats.productMetrics.dropOffRate}%
              </p>
              <p className="text-xs text-stone-400">single session users</p>
            </div>
            <div>
              <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Bounce Rate</p>
              <p className={`text-2xl font-bold ${stats.productMetrics.bounceRate <= 20 ? 'text-emerald-600' : stats.productMetrics.bounceRate <= 40 ? 'text-amber-600' : 'text-red-500'}`}>
                {stats.productMetrics.bounceRate}%
              </p>
              <p className="text-xs text-stone-400">≤2 messages total</p>
            </div>
            <div>
              <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Feedback Rate</p>
              <p className={`text-2xl font-bold ${stats.productMetrics.feedbackRate >= 20 ? 'text-emerald-600' : stats.productMetrics.feedbackRate >= 10 ? 'text-amber-600' : 'text-stone-900'}`}>
                {stats.productMetrics.feedbackRate}%
              </p>
              <p className="text-xs text-stone-400">responses with feedback</p>
            </div>
            <div>
              <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Satisfaction</p>
              <p className={`text-2xl font-bold ${
                stats.feedback.total > 0 && (stats.feedback.thumbsUp / stats.feedback.total) >= 0.7
                  ? 'text-emerald-600'
                  : stats.feedback.total > 0 && (stats.feedback.thumbsUp / stats.feedback.total) >= 0.4
                  ? 'text-amber-600'
                  : 'text-stone-900'
              }`}>
                {stats.feedback.total > 0
                  ? `${Math.round((stats.feedback.thumbsUp / stats.feedback.total) * 100)}%`
                  : "—"}
              </p>
              <p className="text-xs text-stone-400">thumbs up rate</p>
            </div>
          </div>
        </div>

        {/* Group Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          {/* Krokyo Group */}
          <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-soft-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-3 h-3 rounded-full bg-teal-500" />
              <h2 className="font-display text-lg font-semibold text-stone-900">Krokyo (Socratic)</h2>
            </div>
            <div className="grid grid-cols-2 gap-5 mb-5">
              <div>
                <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider">Participants</p>
                <p className="text-2xl font-bold text-stone-900 mt-1">{stats.users.krokyo}</p>
              </div>
              <div>
                <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider">Avg Questions</p>
                <p className="text-2xl font-bold text-stone-900 mt-1">{krokyoMessages?.avgMessages || 0}</p>
              </div>
              <div>
                <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider">Response Time</p>
                <p className="text-2xl font-bold text-stone-900 mt-1">
                  {krokyoResponseTime?.avgResponseTime
                    ? `${Math.round(krokyoResponseTime.avgResponseTime / 1000)}s`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider">Satisfaction</p>
                <p
                  className={`text-2xl font-bold mt-1 ${
                    krokyoSatisfaction !== null && krokyoSatisfaction >= 70
                      ? "text-emerald-600"
                      : krokyoSatisfaction !== null && krokyoSatisfaction >= 40
                      ? "text-amber-600"
                      : "text-stone-900"
                  }`}
                >
                  {krokyoSatisfaction !== null ? `${krokyoSatisfaction}%` : "—"}
                </p>
              </div>
            </div>
            <div className="flex gap-3 text-sm">
              <span className="inline-flex items-center gap-1.5 text-emerald-600 font-medium">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
                {krokyoFeedback?.thumbsUp || 0}
              </span>
              <span className="inline-flex items-center gap-1.5 text-red-500 font-medium">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                </svg>
                {krokyoFeedback?.thumbsDown || 0}
              </span>
            </div>
          </div>

          {/* Control Group */}
          <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-soft-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-3 h-3 rounded-full bg-violet-500" />
              <h2 className="font-display text-lg font-semibold text-stone-900">Control (Direct)</h2>
            </div>
            <div className="grid grid-cols-2 gap-5 mb-5">
              <div>
                <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider">Participants</p>
                <p className="text-2xl font-bold text-stone-900 mt-1">{stats.users.control}</p>
              </div>
              <div>
                <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider">Avg Questions</p>
                <p className="text-2xl font-bold text-stone-900 mt-1">{controlMessages?.avgMessages || 0}</p>
              </div>
              <div>
                <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider">Response Time</p>
                <p className="text-2xl font-bold text-stone-900 mt-1">
                  {controlResponseTime?.avgResponseTime
                    ? `${Math.round(controlResponseTime.avgResponseTime / 1000)}s`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider">Satisfaction</p>
                <p
                  className={`text-2xl font-bold mt-1 ${
                    controlSatisfaction !== null && controlSatisfaction >= 70
                      ? "text-emerald-600"
                      : controlSatisfaction !== null && controlSatisfaction >= 40
                      ? "text-amber-600"
                      : "text-stone-900"
                  }`}
                >
                  {controlSatisfaction !== null ? `${controlSatisfaction}%` : "—"}
                </p>
              </div>
            </div>
            <div className="flex gap-3 text-sm">
              <span className="inline-flex items-center gap-1.5 text-emerald-600 font-medium">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
                {controlFeedback?.thumbsUp || 0}
              </span>
              <span className="inline-flex items-center gap-1.5 text-red-500 font-medium">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                </svg>
                {controlFeedback?.thumbsDown || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-soft-sm">
            <h3 className="text-sm font-semibold text-stone-700 mb-5">Group Distribution</h3>
            <BarChart
              label="Participants"
              maxValue={Math.max(stats.users.krokyo, stats.users.control, 1)}
              data={[
                { label: "Krokyo", value: stats.users.krokyo, color: "bg-teal-500" },
                { label: "Control", value: stats.users.control, color: "bg-violet-500" },
              ]}
            />
          </div>

          <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-soft-sm">
            <h3 className="text-sm font-semibold text-stone-700 mb-5 text-center">Overall Satisfaction</h3>
            <SatisfactionGauge thumbsUp={stats.feedback.thumbsUp} thumbsDown={stats.feedback.thumbsDown} />
          </div>

          <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-soft-sm">
            <h3 className="text-sm font-semibold text-stone-700 mb-5">Messages (Last 7 Days)</h3>
            <MiniLineChart data={stats.dailyActivity} />
          </div>
        </div>

        {/* Recent Participants Table */}
        <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-soft-sm">
          <h3 className="font-display text-lg font-semibold text-stone-900 mb-5">Recent Participants</h3>
          {stats.recentUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200">
                    <th className="text-left py-3 px-4 text-stone-500 font-semibold text-xs uppercase tracking-wider">ID</th>
                    <th className="text-left py-3 px-4 text-stone-500 font-semibold text-xs uppercase tracking-wider">Group</th>
                    <th className="text-left py-3 px-4 text-stone-500 font-semibold text-xs uppercase tracking-wider">Questions</th>
                    <th className="text-left py-3 px-4 text-stone-500 font-semibold text-xs uppercase tracking-wider">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentUsers.map((user) => (
                    <tr key={user.id} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-stone-600">{user.id.slice(0, 8)}...</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            user.group === "krokyo" ? "bg-teal-100 text-teal-700" : "bg-violet-100 text-violet-700"
                          }`}
                        >
                          {user.group}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-stone-900 font-medium">{user.messageCount}</td>
                      <td className="py-3 px-4 text-stone-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-stone-500 text-center py-6">No participants yet</p>
          )}
        </div>

        {/* Experiment Info */}
        <div className="bg-stone-100 rounded-xl p-6 mt-10">
          <h3 className="font-display text-sm font-semibold text-stone-700 mb-3">Experiment Design</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-stone-600">
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
                <span className="font-medium text-teal-600">Krokyo:</span> Socratic method (asks questions first)
              </p>
              <p>
                <span className="font-medium text-violet-600">Control:</span> Direct answers (complete explanations)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
