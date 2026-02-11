import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import Input from "../../../ui/Input";
import Select from "../../../ui/Select";
import Button from "../../../ui/Button";
import API from "../../../../api";
import { useAuth } from "../../../../auth/AuthContext";

export default function DepartmentForm({
  editData,
  userRole,
  selectedCompanyId,
  selectedCompanyName,
  onSave,
  onCancel,
}) {
  const { user } = useAuth();
  const currentUserId = user?.userId ?? user?.id ?? "system";
  const [departmentName, setDepartmentName] = useState(editData?.departmentName || "");
  const [departmentAcr, setDepartmentAcr] = useState(editData?.departmentAcr || "");
  const [companyId, setCompanyId] = useState(editData?.companyId || selectedCompanyId || "");
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    if (userRole !== "Super Admin") return;

    const fetchCompanies = async () => {
      try {
        const res = await API.get("/companies");
        setCompanies(res.data || []);
        if (selectedCompanyId && !editData) {
          setCompanyId(selectedCompanyId);
        }
      } catch (err) {
        console.error("Error fetching companies:", err);
      }
    };

    fetchCompanies();
  }, [userRole, selectedCompanyId, editData]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!departmentName.trim()) return toast.error("Department Name is required");
    if (!departmentAcr.trim()) return toast.error("Acronym is required");
    if (userRole === "Super Admin" && !companyId) return toast.error("Please select a company");

    const payload = {
      departmentName: departmentName.trim(),
      departmentAcr: departmentAcr.trim().toUpperCase(),
      status: editData?.status || "active",
      companyId: companyId || selectedCompanyId || 1,
      createdBy: editData?.createdBy || currentUserId,
      updatedBy: currentUserId,
    };

    onSave(payload, editData?.departmentId);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        label="Department Name"
        value={departmentName}
        onChange={(e) => setDepartmentName(e.target.value)}
        placeholder="Enter department name"
        required
      />

      <Input
        label="Acronym"
        value={departmentAcr}
        onChange={(e) => setDepartmentAcr(e.target.value)}
        placeholder="Enter short name (e.g. HR, FIN)"
        required
      />

      <div>
        <label className="block font-medium text-gray-700 mb-2">Company</label>
        {userRole === "Super Admin" ? (
          <Select
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            options={companies
              .filter((c) => c.companyId !== 1)
              .map((c) => ({ value: c.companyId, label: c.companyName }))}
            placeholder="Select Company"
            disabled={!!editData}
          />
        ) : (
          <Input value={selectedCompanyName || "No company selected"} disabled />
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
