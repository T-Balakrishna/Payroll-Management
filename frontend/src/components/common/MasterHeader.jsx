import { Plus } from "lucide-react";

export default function MasterHeader({
  search,
  setSearch,
  onAddNew,
  placeholder = "Search...",
  buttonText = "Add New",
  actions = null,
}) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
      <input
        type="text"
        placeholder={placeholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border border-gray-300 bg-white rounded-lg px-4 py-2.5 w-full sm:w-80 outline-none focus:ring-2 focus:ring-blue-400 transition-all"
      />
      <div className="flex items-center gap-2">
        <button
          onClick={onAddNew}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg shadow-md whitespace-nowrap"
        >
          <Plus size={18} /> {buttonText}
        </button>
        {actions}
      </div>
    </div>
  );
}
