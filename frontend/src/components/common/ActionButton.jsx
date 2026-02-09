import { Pencil, Trash2 } from "lucide-react";

export default function ActionButtons({ onEdit, onDelete }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onEdit}
        className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors"
        title="Edit"
      >
        <Pencil size={16} />
      </button>
      <button
        onClick={onDelete}
        className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors"
        title="Delete"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}