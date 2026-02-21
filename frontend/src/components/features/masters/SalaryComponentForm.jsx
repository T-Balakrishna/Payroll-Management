import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import Button from "../../../components/ui/Button";
import API from "../../../api";
import { useAuth } from "../../../auth/AuthContext";

const DEFAULT_FORM = {
  name: "",
  code: "",
  description: "",
  type: "Earning",
  calculationType: "Fixed",
  defaultAmount: "",
  percentage: "",
  percentageBase: "",
  formula: "",
  affectsGrossSalary: true,
  affectsNetSalary: true,
  isTaxable: true,
  isStatutory: false,
  displayOrder: 0,
};

const normalizeRole = (role) => String(role || "").replace(/\s+/g, "").toLowerCase();

const toNullableString = (value) => {
  const text = String(value || "").trim();
  return text ? text : null;
};

const toNonNegativeNumberOrNull = (value) => {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const parsed = Number.parseFloat(text);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
};

export default function SalaryComponentForm({
  editData,
  userRole,
  selectedCompanyId,
  selectedCompanyName,
  onSave,
  onCancel,
}) {
  const { user } = useAuth();
  const isSuperAdmin = normalizeRole(userRole || user?.role) === "superadmin";
  const currentUserId = user?.userId ?? user?.id ?? "system";

  const [form, setForm] = useState(DEFAULT_FORM);
  const [companyId, setCompanyId] = useState(
    editData?.companyId || (!isSuperAdmin ? selectedCompanyId : "")
  );
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    const id = setTimeout(() => {
      setForm({
        ...DEFAULT_FORM,
        ...editData,
        defaultAmount:
          editData?.defaultAmount === null || editData?.defaultAmount === undefined
            ? ""
            : String(editData.defaultAmount),
        percentage:
          editData?.percentage === null || editData?.percentage === undefined
            ? ""
            : String(editData.percentage),
        percentageBase: editData?.percentageBase || "",
        formula: editData?.formula || "",
        displayOrder: editData?.displayOrder ?? 0,
      });
      setCompanyId(editData?.companyId || (!isSuperAdmin ? selectedCompanyId : ""));
    }, 0);

    return () => clearTimeout(id);
  }, [editData, isSuperAdmin, selectedCompanyId]);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await API.get("/companies");
        const data = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];
        setCompanies(data);

        if (isSuperAdmin && selectedCompanyId && !editData) {
          setCompanyId(selectedCompanyId);
        }
      } catch (err) {
        console.error("Error fetching companies:", err);
        toast.error("Failed to load companies");
      }
    };

    fetchCompanies();
  }, [editData, isSuperAdmin, selectedCompanyId]);

  const adminCompanyName = useMemo(() => {
    if (selectedCompanyName) return selectedCompanyName;
    if (!selectedCompanyId) return "No company selected";
    const match = companies.find((c) => String(c.companyId) === String(selectedCompanyId));
    return match?.companyName || `Company #${selectedCompanyId}`;
  }, [companies, selectedCompanyId, selectedCompanyName]);

  const effectiveCompanyId = companyId || selectedCompanyId || "";

  const setField = (key) => (e) => {
    const value = e?.target?.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.name?.trim()) return toast.error("Component name is required");
    if (!form.code?.trim()) return toast.error("Component code is required");
    if (!form.type) return toast.error("Component type is required");
    if (!form.calculationType) return toast.error("Calculation type is required");
    if (isSuperAdmin && !effectiveCompanyId) return toast.error("Please select a company");

    const displayOrder = Number.parseInt(String(form.displayOrder), 10);
    if (!Number.isInteger(displayOrder) || displayOrder < 0) {
      return toast.error("Display order must be a non-negative integer");
    }

    const defaultAmount = toNonNegativeNumberOrNull(form.defaultAmount);
    const percentage = toNonNegativeNumberOrNull(form.percentage);

    if (form.calculationType === "Fixed" && defaultAmount === null) {
      return toast.error("Default amount is required for Fixed calculation");
    }
    if (form.calculationType === "Percentage") {
      if (percentage === null || percentage <= 0 || percentage > 100) {
        return toast.error("Percentage must be greater than 0 and up to 100");
      }
      if (!String(form.percentageBase || "").trim()) {
        return toast.error("Percentage base is required");
      }
    }
    if (form.calculationType === "Formula" && !String(form.formula || "").trim()) {
      return toast.error("Formula is required");
    }

    const payload = {
      name: String(form.name || "").trim(),
      code: String(form.code || "").trim().toUpperCase(),
      description: toNullableString(form.description),
      type: form.type,
      calculationType: form.calculationType,
      defaultAmount: form.calculationType === "Fixed" ? defaultAmount : null,
      percentage: form.calculationType === "Percentage" ? percentage : null,
      percentageBase:
        form.calculationType === "Percentage"
          ? String(form.percentageBase || "").trim().toUpperCase()
          : null,
      formula: form.calculationType === "Formula" ? String(form.formula || "").trim() : null,
      affectsGrossSalary: Boolean(form.affectsGrossSalary),
      affectsNetSalary: Boolean(form.affectsNetSalary),
      isTaxable: Boolean(form.isTaxable),
      isStatutory: Boolean(form.isStatutory),
      displayOrder,
      companyId: effectiveCompanyId,
      createdBy: editData?.createdBy || currentUserId,
      updatedBy: currentUserId,
    };

    onSave(payload, editData?.salaryComponentId);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Component Name"
          value={form.name}
          onChange={setField("name")}
          placeholder='Enter name (e.g. "Basic Pay")'
          required
        />
        <Input
          label="Component Code"
          value={form.code}
          onChange={setField("code")}
          placeholder='Enter code (e.g. "BASIC")'
          required
          maxLength={20}
        />
      </div>

      <div>
        <label className="block font-medium text-gray-700 mb-2">Description</label>
        <textarea
          value={form.description || ""}
          onChange={setField("description")}
          rows={3}
          className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          placeholder="Optional description"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Select
          label="Type"
          value={form.type}
          onChange={setField("type")}
          options={[
            { value: "Earning", label: "Earning" },
            { value: "Deduction", label: "Deduction" },
          ]}
          required
        />
        <Select
          label="Calculation Type"
          value={form.calculationType}
          onChange={setField("calculationType")}
          options={[
            { value: "Fixed", label: "Fixed" },
            { value: "Percentage", label: "Percentage" },
            { value: "Formula", label: "Formula" },
          ]}
          required
        />
        <Input
          label="Display Order"
          type="number"
          min={0}
          value={form.displayOrder}
          onChange={setField("displayOrder")}
          required
        />
      </div>

      {form.calculationType === "Fixed" && (
        <Input
          label="Default Amount"
          type="number"
          min={0}
          step="0.01"
          value={form.defaultAmount}
          onChange={setField("defaultAmount")}
          placeholder="0.00"
          required
        />
      )}

      {form.calculationType === "Percentage" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Percentage (%)"
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={form.percentage}
            onChange={setField("percentage")}
            placeholder="e.g. 12"
            required
          />
          <Input
            label="Percentage Base Code"
            value={form.percentageBase}
            onChange={setField("percentageBase")}
            placeholder='e.g. "BASIC" or "GROSS"'
            required
          />
        </div>
      )}

      {form.calculationType === "Formula" && (
        <div>
          <label className="block font-medium text-gray-700 mb-2">
            Formula <span className="text-red-500 ml-1">*</span>
          </label>
          <textarea
            value={form.formula || ""}
            onChange={setField("formula")}
            rows={3}
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            placeholder='e.g. "(BASIC + DA) * 0.1"'
            required
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={Boolean(form.affectsGrossSalary)}
            onChange={setField("affectsGrossSalary")}
          />
          Affects Gross Salary
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={Boolean(form.affectsNetSalary)}
            onChange={setField("affectsNetSalary")}
          />
          Affects Net Salary
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={Boolean(form.isTaxable)} onChange={setField("isTaxable")} />
          Taxable Component
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={Boolean(form.isStatutory)} onChange={setField("isStatutory")} />
          Statutory Component
        </label>
      </div>

      <div>
        <label className="block font-medium text-gray-700 mb-2">Company</label>
        {isSuperAdmin ? (
          <Select
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            options={companies.map((c) => ({ value: c.companyId, label: c.companyName }))}
            placeholder="Select Company"
          />
        ) : (
          <Input value={adminCompanyName} disabled />
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{editData ? "Update Changes" : "Save"}</Button>
      </div>
    </form>
  );
}
