import { Pencil, Trash2 } from "lucide-react";

export default function ActionButtons({ onEdit, onDelete }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onEdit}
        className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-md transition-colors"
        title="Edit"
      >
        <Pencil size={16} />
      </button>
      <button
        onClick={onDelete}
        className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-md transition-colors"
        title="Delete"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
