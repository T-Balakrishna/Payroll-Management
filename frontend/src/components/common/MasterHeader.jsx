import { Plus } from "lucide-react";
import RefreshButton from "./RefreshButton";

export default function MasterHeader({
  search,
  setSearch,
  onAddNew,
  onRefresh,
  loadingRefresh = false,
  placeholder = "Search...",
  buttonText = "Add New",
  actions = null,
}) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
      <input
        type="text"
        placeholder={placeholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border border-gray-200 bg-white text-gray-800 rounded-xl px-4 py-2.5 w-full sm:w-1/3 min-w-64 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all shadow-sm placeholder-gray-400 text-sm"
      />
      <div className="flex items-center gap-2">
        <RefreshButton onRefresh={onRefresh || (() => {})} loading={loadingRefresh} />
        <button
          onClick={onAddNew}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white px-4 py-2.5 rounded-xl shadow-md shadow-blue-200 hover:shadow-blue-300 font-semibold text-sm whitespace-nowrap transition-all hover:-translate-y-0.5"
        >
          <Plus size={18} /> {buttonText}
        </button>
        {actions}
      </div>
    </div>
  );
}