import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import Button from "../../../components/ui/Button";
import API from "../../../api";
import { useAuth } from "../../../auth/AuthContext";

export default function DepartmentForm({
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
  const currentUserId = user?.userId ?? user?.id ?? null;
  const effectiveAdminCompanyId = selectedCompanyId || user?.companyId || "";

  const [departmentName, setDepartmentName] = useState(editData?.departmentName || "");
  const [departmentAcr, setDepartmentAcr] = useState(editData?.departmentAcr || "");
  const [priorityOrder, setPriorityOrder] = useState(
    Number.isFinite(Number(editData?.priorityOrder)) ? Number(editData?.priorityOrder) : 0
  );
  const [companyId, setCompanyId] = useState(
    editData?.companyId || (!isSuperAdmin ? effectiveAdminCompanyId : "")
  );
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    const id = setTimeout(() => {
      setDepartmentName(editData?.departmentName || "");
      setDepartmentAcr(editData?.departmentAcr || "");
      setPriorityOrder(
        Number.isFinite(Number(editData?.priorityOrder)) ? Number(editData?.priorityOrder) : 0
      );
      setCompanyId(editData?.companyId || (!isSuperAdmin ? effectiveAdminCompanyId : ""));
    }, 0);
    return () => clearTimeout(id);
  }, [editData, isSuperAdmin, effectiveAdminCompanyId]);

  useEffect(() => {
    if (!isSuperAdmin && (selectedCompanyName || !selectedCompanyId)) {
      return;
    }

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
    if (!effectiveAdminCompanyId) return "No company selected";

    const match = companies.find((c) => String(c.companyId) === String(effectiveAdminCompanyId));
    return match?.companyName || `Company #${effectiveAdminCompanyId}`;
  }, [effectiveAdminCompanyId, selectedCompanyName, companies]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!departmentName.trim()) return toast.error("Department Name is required");
    if (!departmentAcr.trim()) return toast.error("Acronym is required");
    if (isSuperAdmin && !companyId) return toast.error("Please select a company");
    if (!isSuperAdmin && !effectiveAdminCompanyId) {
      return toast.error("Company is not resolved for current user");
    }

    const normalizeStatus = (rawStatus) => {
      const value = String(rawStatus || "").trim().toLowerCase();
      if (value === "inactive") return "Inactive";
      if (value === "archived") return "Archived";
      return "Active";
    };

    const payload = {
      departmentName: departmentName.trim(),
      departmentAcr: departmentAcr.trim().toUpperCase(),
      priorityOrder: Number.isFinite(Number(priorityOrder)) ? Number(priorityOrder) : 0,
      status: normalizeStatus(editData?.status),
      companyId: companyId || effectiveAdminCompanyId,
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
        placeholder="Enter short code (e.g. HR, FIN, IT)"
        required
      />

      <Input
        label="Priority Order"
        type="number"
        value={priorityOrder}
        onChange={(e) => setPriorityOrder(e.target.value)}
        placeholder="Enter display priority (lower comes first)"
        min="0"
      />

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
