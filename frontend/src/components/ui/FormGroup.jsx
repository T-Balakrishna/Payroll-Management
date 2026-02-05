// src/components/ui/FormGroup.jsx
export default function FormGroup({ label, children, required = false }) {
  return (
    <div>
      <label className="block font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}