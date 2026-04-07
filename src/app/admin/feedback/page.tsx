"use client";

import { useEffect, useState } from "react";

interface BugReport {
  id: string;
  userId: string | null;
  type: "bug" | "feedback" | "feature";
  title: string;
  description: string;
  page: string | null;
  status: "new" | "in-progress" | "resolved" | "closed";
  createdAt: string;
  resolvedAt: string | null;
  user: {
    id: string;
    email: string;
  } | null;
}

const typeStyles = {
  bug: "bg-red-100 text-red-700",
  feedback: "bg-blue-100 text-blue-700",
  feature: "bg-purple-100 text-purple-700",
};

const typeLabels = {
  bug: "Bug",
  feedback: "Feedback",
  feature: "Feature",
};

const statusStyles = {
  new: "bg-yellow-100 text-yellow-700",
  "in-progress": "bg-blue-100 text-blue-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-stone-100 text-stone-700",
};

const statusLabels = {
  new: "New",
  "in-progress": "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

export default function FeedbackPage() {
  const [reports, setReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "bug" | "feedback" | "feature">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "new" | "in-progress" | "resolved" | "closed">("all");
  const [selectedReport, setSelectedReport] = useState<BugReport | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await fetch("/api/bug-reports");
      const data = await res.json();
      setReports(data.reports || []);
    } catch (error) {
      console.error("Failed to fetch reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/bug-reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        setReports(reports.map(r =>
          r.id === id ? { ...r, status: status as BugReport["status"] } : r
        ));
        if (selectedReport?.id === id) {
          setSelectedReport({ ...selectedReport, status: status as BugReport["status"] });
        }
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const deleteReport = async (id: string) => {
    if (!confirm("Are you sure you want to delete this report?")) return;

    try {
      const res = await fetch(`/api/bug-reports/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setReports(reports.filter(r => r.id !== id));
        if (selectedReport?.id === id) {
          setSelectedReport(null);
        }
      }
    } catch (error) {
      console.error("Failed to delete report:", error);
    }
  };

  const filteredReports = reports.filter(r => {
    if (filter !== "all" && r.type !== filter) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    return true;
  });

  const counts = {
    all: reports.length,
    bug: reports.filter(r => r.type === "bug").length,
    feedback: reports.filter(r => r.type === "feedback").length,
    feature: reports.filter(r => r.type === "feature").length,
    new: reports.filter(r => r.status === "new").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-stone-900">Feedback & Reports</h1>
        <p className="text-stone-500 text-sm mt-1">
          View and manage user feedback, bug reports, and feature requests
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-stone-200">
          <div className="text-2xl font-bold text-stone-900">{counts.all}</div>
          <div className="text-sm text-stone-500">Total Reports</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-stone-200">
          <div className="text-2xl font-bold text-yellow-600">{counts.new}</div>
          <div className="text-sm text-stone-500">New / Unread</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-stone-200">
          <div className="text-2xl font-bold text-red-600">{counts.bug}</div>
          <div className="text-sm text-stone-500">Bug Reports</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-stone-200">
          <div className="text-2xl font-bold text-purple-600">{counts.feature}</div>
          <div className="text-sm text-stone-500">Feature Requests</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex gap-2">
          <span className="text-sm text-stone-500 py-2">Type:</span>
          {(["all", "bug", "feedback", "feature"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === type
                  ? "bg-teal-50 text-teal-700"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              {type === "all" ? "All" : typeLabels[type]}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <span className="text-sm text-stone-500 py-2">Status:</span>
          {(["all", "new", "in-progress", "resolved", "closed"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === status
                  ? "bg-teal-50 text-teal-700"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              {status === "all" ? "All" : statusLabels[status]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-6">
        {/* List */}
        <div className="flex-1 bg-white rounded-xl border border-stone-200 overflow-hidden">
          {filteredReports.length === 0 ? (
            <div className="p-8 text-center text-stone-500">
              No reports found
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Title</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">User</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredReports.map((report) => (
                  <tr
                    key={report.id}
                    onClick={() => setSelectedReport(report)}
                    className={`cursor-pointer transition-colors ${
                      selectedReport?.id === report.id
                        ? "bg-teal-50"
                        : "hover:bg-stone-50"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeStyles[report.type]}`}>
                        {typeLabels[report.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-stone-900 text-sm">{report.title}</div>
                      {report.page && (
                        <div className="text-xs text-stone-400">{report.page}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-600">
                      {report.user?.email || "Anonymous"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[report.status]}`}>
                        {statusLabels[report.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-500">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail Panel */}
        {selectedReport && (
          <div className="w-[400px] bg-white rounded-xl border border-stone-200 p-6 space-y-4 h-fit sticky top-6">
            <div className="flex items-start justify-between">
              <div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeStyles[selectedReport.type]}`}>
                  {typeLabels[selectedReport.type]}
                </span>
                <h2 className="font-display text-lg font-semibold text-stone-900 mt-2">
                  {selectedReport.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-1 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <span className="text-stone-500">From:</span>
                <span className="ml-2 text-stone-900">{selectedReport.user?.email || "Anonymous"}</span>
              </div>
              {selectedReport.page && (
                <div>
                  <span className="text-stone-500">Page:</span>
                  <span className="ml-2 text-stone-900 font-mono text-xs">{selectedReport.page}</span>
                </div>
              )}
              <div>
                <span className="text-stone-500">Submitted:</span>
                <span className="ml-2 text-stone-900">
                  {new Date(selectedReport.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-stone-700 mb-2">Description</div>
              <p className="text-sm text-stone-600 whitespace-pre-wrap bg-stone-50 rounded-lg p-3">
                {selectedReport.description}
              </p>
            </div>

            <div>
              <div className="text-sm font-medium text-stone-700 mb-2">Status</div>
              <div className="flex gap-2">
                {(["new", "in-progress", "resolved", "closed"] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => updateStatus(selectedReport.id, status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      selectedReport.status === status
                        ? statusStyles[status]
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                  >
                    {statusLabels[status]}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => deleteReport(selectedReport.id)}
              className="w-full px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
            >
              Delete Report
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
