import { RefreshCw } from "lucide-react";

export default function RefreshButton({ onRefresh, loading = false }) {
  return (
    <button
      onClick={onRefresh}
      disabled={loading}
      className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-300 text-gray-400 hover:text-blue-600 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
      title="Refresh"
    >
      <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
    </button>
  );
}