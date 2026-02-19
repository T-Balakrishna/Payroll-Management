import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import Button from "../../../components/ui/Button";
import API from "../../../api";
import { useAuth } from "../../../auth/AuthContext";

export default function EmployeeGradeForm({
  editData,
  userRole,
  selectedCompanyId,
  selectedCompanyName,
  onSave,
  onCancel,
}) {
  const { user } = useAuth();
  const normalizeRole = (role) => String(role || "").replace(/\s+/g, "").toLowerCase();
  const isSuperAdmin = normalizeRole(userRole) === "superadmin";
  const currentUserId = user?.userId ?? user?.id ?? "system";

  const [employeeGradeName, setEmployeeGradeName] = useState(editData?.employeeGradeName || "");
  const [employeeGradeAcr, setEmployeeGradeAcr] = useState(editData?.employeeGradeAcr || "");
  const [companyId, setCompanyId] = useState(
    editData?.companyId || (!isSuperAdmin ? selectedCompanyId : "")
  );
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    const id = setTimeout(() => {
      setCompanyId(editData?.companyId || (!isSuperAdmin ? selectedCompanyId : ""));
    }, 0);
    return () => clearTimeout(id);
  }, [editData, isSuperAdmin, selectedCompanyId]);

  useEffect(() => {
    if (!isSuperAdmin && (selectedCompanyName || !selectedCompanyId)) return;

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
  }, [isSuperAdmin, selectedCompanyId, selectedCompanyName, editData]);

  const adminCompanyName = useMemo(() => {
    if (selectedCompanyName) return selectedCompanyName;
    if (!selectedCompanyId) return "No company selected";

    const match = companies.find((c) => String(c.companyId) === String(selectedCompanyId));
    return match?.companyName || `Company #${selectedCompanyId}`;
  }, [selectedCompanyId, selectedCompanyName, companies]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!employeeGradeName.trim()) return toast.error("Employee Grade Name is required");
    if (!employeeGradeAcr.trim()) return toast.error("Acronym is required");
    if (isSuperAdmin && !companyId) return toast.error("Please select a company");

    const payload = {
      employeeGradeName: employeeGradeName.trim(),
      employeeGradeAcr: employeeGradeAcr.trim().toUpperCase(),
      companyId: companyId || selectedCompanyId || 1,
      createdBy: editData?.createdBy || currentUserId,
      updatedBy: currentUserId,
    };

    if (editData?.employeeGradeId && editData?.status) {
      payload.status = editData.status;
    }

    onSave(payload, editData?.employeeGradeId);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        label="Employee Grade Name"
        value={employeeGradeName}
        onChange={(e) => setEmployeeGradeName(e.target.value)}
        placeholder="Enter employee grade name"
        required
      />

      <Input
        label="Acronym"
        value={employeeGradeAcr}
        onChange={(e) => setEmployeeGradeAcr(e.target.value)}
        placeholder="Enter short code (e.g. G1, A1)"
        required
      />

      <div>
        <label className="block font-medium text-gray-700 mb-2">Company</label>
        {isSuperAdmin ? (
          <Select
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            options={companies.map((c) => ({ value: c.companyId, label: c.companyName }))}
            placeholder="Select Company"
            disabled={!!editData}
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
