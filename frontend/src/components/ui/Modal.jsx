import { X } from "lucide-react";

export default function Modal({
  isOpen,
  onClose,
  title,
  icon: Icon,
  children,
  maxWidth = "max-w-xl",
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className={`w-full ${maxWidth} bg-white rounded-2xl shadow-2xl border border-gray-200 relative`}>
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-500 hover:text-gray-800 transition-colors"
        >
          <X size={22} />
        </button>

        {Icon && (
          <div className="flex justify-center mt-8 mb-6">
            <div className="bg-blue-100 p-4 rounded-full">
              <Icon className="text-blue-600" size={40} />
            </div>
          </div>
        )}

        <h2 className="text-2xl font-bold text-gray-800 text-center mb-6 px-8">
          {title}
        </h2>

        <div className="px-8 pb-8">{children}</div>
      </div>
    </div>
  );
}