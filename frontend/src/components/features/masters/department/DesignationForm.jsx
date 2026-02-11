import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export default function DesignationForm({
  editData,
  userRole,
  selectedCompanyId,
  selectedCompanyName,
  onSave,
  onCancel,
}) {
  const [formData, setFormData] = useState({
    designationName: "",
    designationAcr: "",
    status: "Active",
    companyId: selectedCompanyId || "",
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (editData) {
      setFormData({
        designationName: editData.designationName || "",
        designationAcr: editData.designationAcr || "",
        status: editData.status || "Active",
        companyId: editData.companyId || selectedCompanyId || "",
      });
    } else {
      setFormData((prev) => ({
        ...prev,
        companyId: selectedCompanyId || "",
      }));
    }
  }, [editData, selectedCompanyId]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.designationName.trim()) {
      newErrors.designationName = "Designation name is required";
    }
    if (!formData.designationAcr.trim()) {
      newErrors.designationAcr = "Acronym is required";
    } else if (formData.designationAcr.trim().length > 10) {
      newErrors.designationAcr = "Acronym must be 10 characters or less";
    }
    if (!formData.companyId && !selectedCompanyId) {
      newErrors.companyId = "Company is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    setLoading(true);

    const payload = {
      designationName: formData.designationName.trim(),
      designationAcr: formData.designationAcr.trim().toUpperCase(), // common convention for acronyms
      status: formData.status,
      companyId: Number(formData.companyId || selectedCompanyId),
      // You can add updatedBy / createdBy here if your backend doesn't auto-handle it
    };

    try {
      await onSave(payload, editData?.designationId);
      // onSave already shows Swal success + refreshes list + closes modal
    } catch (err) {
      // onSave already handles error Swal — but you can add extra toast if needed
      console.error("Form submission error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Designation Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Designation Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="designationName"
          value={formData.designationName}
          onChange={handleChange}
          className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.designationName ? "border-red-500" : "border-gray-300"
          }`}
          placeholder="e.g. Senior Software Engineer"
        />
        {errors.designationName && (
          <p className="mt-1 text-sm text-red-600">{errors.designationName}</p>
        )}
      </div>

      {/* Acronym */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Acronym / Short Code <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="designationAcr"
          value={formData.designationAcr}
          onChange={handleChange}
          className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.designationAcr ? "border-red-500" : "border-gray-300"
          }`}
          placeholder="e.g. SSE, AM, TL"
          maxLength={10}
        />
        {errors.designationAcr && (
          <p className="mt-1 text-sm text-red-600">{errors.designationAcr}</p>
        )}
      </div>

      {/* Status */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Status
        </label>
        <select
          name="status"
          value={formData.status}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="Archived">Archived</option>
        </select>
      </div>

      {/* Company – only show if NOT in company-specific view */}
      {!selectedCompanyId && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Company <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={selectedCompanyName || "—"}
            disabled
            className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-md cursor-not-allowed"
          />
          {/* If you later want to allow changing company → replace with select */}
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-end gap-4 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-5 py-2.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              </svg>
              Saving...
            </>
          ) : editData ? (
            "Update Designation"
          ) : (
            "Add Designation"
          )}
        </button>
      </div>
    </form>
  );
}