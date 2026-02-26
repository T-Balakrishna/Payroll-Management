import { Pencil, Trash2 } from "lucide-react";

export default function ActionButtons({ onEdit, onDelete }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onEdit}
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 text-blue-600 hover:text-blue-700 transition-all shadow-sm"
        title="Edit"
      >
        <Pencil size={14} />
      </button>
      <button
        onClick={onDelete}
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 text-red-500 hover:text-red-600 transition-all shadow-sm"
        title="Delete"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}