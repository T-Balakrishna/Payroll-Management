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

const normalizeFormulaOperators = (formula) =>
  String(formula || "").replace(/!==/g, "!=").replace(/===/g, "==");

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
  const [showSampleFormulas, setShowSampleFormulas] = useState(false);
  const [companyId, setCompanyId] = useState(
    editData?.companyId || (!isSuperAdmin ? selectedCompanyId : "")
  );
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    const id = setTimeout(() => {
      const type = editData?.type || "Earning";
      setForm({
        ...DEFAULT_FORM,
        ...editData,
        type,
        calculationType:
          type === "Deduction"
            ? "Formula"
            : (editData?.calculationType === "Formula" ? "Formula" : "Fixed"),
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

    if (key === "type") {
      const calculationType = value === "Deduction" ? "Formula" : "Fixed";
      setForm((prev) => ({
        ...prev,
        type: value,
        calculationType,
        formula: value === "Deduction" ? prev.formula : (calculationType === "Formula" ? prev.formula : ""),
      }));
      return;
    }

    if (key === "calculationType") {
      const nextValue = value === "Formula" ? "Formula" : "Fixed";
      setForm((prev) => ({
        ...prev,
        calculationType: prev.type === "Deduction" ? "Formula" : nextValue,
        formula: nextValue === "Formula" ? prev.formula : "",
      }));
      return;
    }

    if (key === "formula") {
      setForm((prev) => ({ ...prev, formula: normalizeFormulaOperators(value) }));
      return;
    }

    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.name?.trim()) return toast.error("Component name is required");
    if (!form.code?.trim()) return toast.error("Component code is required");
    if (!form.type) return toast.error("Component type is required");
    if (isSuperAdmin && !effectiveCompanyId) return toast.error("Please select a company");

    const displayOrder = Number.parseInt(String(form.displayOrder), 10);
    if (!Number.isInteger(displayOrder) || displayOrder < 0) {
      return toast.error("Display order must be a non-negative integer");
    }

    const calculationType = form.type === "Deduction"
      ? "Formula"
      : (form.calculationType === "Formula" ? "Formula" : "Fixed");

    if (calculationType === "Formula" && !String(form.formula || "").trim()) {
      return toast.error("Formula is required for formula-based component");
    }

    const payload = {
      name: String(form.name || "").trim(),
      code: String(form.code || "").trim().toUpperCase(),
      description: toNullableString(form.description),
      type: form.type,
      calculationType,
      formula: calculationType === "Formula" ? normalizeFormulaOperators(String(form.formula || "").trim()) : null,
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
          options={
            form.type === "Deduction"
              ? [{ value: "Formula", label: "Formula" }]
              : [
                  { value: "Fixed", label: "Fixed" },
                  { value: "Formula", label: "Formula" },
                ]
          }
          disabled={form.type === "Deduction"}
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

      {form.type === "Earning" && form.calculationType === "Fixed" && (
        <div className="text-sm text-gray-600 bg-gray-50 border rounded-lg p-3">
          Earning components do not keep a default amount. Assign employee-specific values in Salary Assignment.
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
            rows={5}
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            placeholder='e.g. department == "HR" && designation == "Sr Grade" ? BASIC * 0.15 : designation == "Jr Grade" ? BASIC * 0.10 : BASIC * 0.05'
            required
          />
          <div className="mt-2 text-xs text-gray-600">
            <p>You can apply multiple conditions using <code>&&</code>, <code>||</code>, and nested ternary.</p>
            <p>Use payable-day logic with attendance variables like <code>present</code> and <code>leave</code>.</p>
          </div>

          <div className="mt-3 border rounded-lg bg-gray-50">
            <button
              type="button"
              onClick={() => setShowSampleFormulas((prev) => !prev)}
              className="w-full text-left px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              {showSampleFormulas ? "Hide sample formulas" : "Show sample formulas"}
            </button>

            {showSampleFormulas && (
              <div className="px-3 pb-3 text-xs text-gray-700 space-y-2">
                <p>1. Attendance incentive based on payable days:</p>
                <p><code>(NORM(designation) == NORM("Sweeper") || NORM(designation) == NORM("Gardener")) ? (present + (leave - lossOfPayLeave)) * 100 : 0</code></p>
                <p>2. Formula for selected months:</p>
                <p><code>(payMonth == 2 || payMonth == 9) ? BASIC * 0.05 : 0</code></p>
                <p>3. Deduction based on non-LOP leave only:</p>
                <p><code>leave &gt; lossOfPayLeave ? (leave - lossOfPayLeave) * 200 : 0</code></p>
              </div>
            )}
          </div>
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
