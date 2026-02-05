export default function Input({
  label,
  value,
  onChange,
  placeholder = "",
  disabled = false,
  required = false,
  type = "text",
  ...props
}) {
  return (
    <div>
      {label && (
        <label className="block font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        value={value ?? ""}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${
          disabled ? "bg-gray-100 cursor-not-allowed" : ""
        }`}
        {...props}
      />
    </div>
  );
}