import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import Button from "../../../components/ui/Button";
import API from "../../../api";
import { useAuth } from "../../../auth/AuthContext";

export default function DesignationForm({
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

  const [designationName, setDesignationName] = useState(editData?.designationName || "");
  const [designationAcr, setDesignationAcr] = useState(editData?.designationAcr || "");
  const [companyId, setCompanyId] = useState(
    editData?.companyId || (!isSuperAdmin ? selectedCompanyId : "")
  );
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    setCompanyId(editData?.companyId || (!isSuperAdmin ? selectedCompanyId : ""));
  }, [editData, isSuperAdmin, selectedCompanyId]);

  useEffect(() => {
    // Super admin needs list for selection; admin needs fallback name resolution.
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
    if (!selectedCompanyId) return "No company selected";

    const match = companies.find((c) => String(c.companyId) === String(selectedCompanyId));
    return match?.companyName || `Company #${selectedCompanyId}`;
  }, [selectedCompanyId, selectedCompanyName, companies]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!designationName.trim()) return toast.error("Designation Name is required");
    if (!designationAcr.trim()) return toast.error("Acronym is required");

    if (isSuperAdmin && !companyId) {
      return toast.error("Please select a company");
    }

    const normalizeStatus = (rawStatus) => {
      const value = String(rawStatus || "").trim().toLowerCase();
      if (value === "inactive") return "Inactive";
      if (value === "archived") return "Archived";
      return "Active";
    };

    const payload = {
      designationName: designationName.trim(),
      designationAcr: designationAcr.trim().toUpperCase(),
      status: normalizeStatus(editData?.status),
      companyId: companyId || selectedCompanyId,
      createdBy: editData?.createdBy || currentUserId,
      updatedBy: currentUserId,
    };

    onSave(payload, editData?.designationId);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        label="Designation Name"
        value={designationName}
        onChange={(e) => setDesignationName(e.target.value)}
        placeholder="Enter designation name"
        required
      />

      <Input
        label="Acronym"
        value={designationAcr}
        onChange={(e) => setDesignationAcr(e.target.value)}
        placeholder="Enter short code (e.g. SSE, AM, TL)"
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
