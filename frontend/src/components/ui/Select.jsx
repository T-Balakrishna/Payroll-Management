export default function Select({
  label,
  value,
  onChange,
  options,
  placeholder = "Select...",
  disabled = false,
  required = false,
  allowPlaceholderSelection = false,
}) {
  return (
    <div>
      {label && (
        <label className="block font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        value={value ?? ""}
        onChange={onChange}
        disabled={disabled}
        className={`w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${
          disabled ? "bg-gray-100 cursor-not-allowed" : ""
        }`}
      >
        <option value="" disabled={!allowPlaceholderSelection}>
          {placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
