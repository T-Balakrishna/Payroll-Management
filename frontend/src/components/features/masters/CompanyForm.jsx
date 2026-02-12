import React, { useState } from "react";
import { toast } from "react-toastify";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import { useAuth } from "../../../auth/AuthContext";

export default function CompanyForm({ editData, onSave, onCancel }) {
  const { user } = useAuth();
  const currentUserId = user?.userId ?? user?.id ?? null;

  const [companyName, setCompanyName] = useState(editData?.companyName || "");
  const [companyAcr, setCompanyAcr] = useState(editData?.companyAcr || "");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!companyName.trim()) return toast.error("Company Name is required");
    if (!companyAcr.trim()) return toast.error("Acronym is required");

    const payload = {
      companyName: companyName.trim(),
      companyAcr: companyAcr.trim().toUpperCase(),
      status: editData?.status || "Active",
      createdBy: editData?.createdBy || currentUserId,
      updatedBy: currentUserId,
    };

    onSave(payload, editData?.companyId);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        label="Company Name"
        value={companyName}
        onChange={(e) => setCompanyName(e.target.value)}
        placeholder="Enter company name"
        required
      />

      <Input
        label="Acronym"
        value={companyAcr}
        onChange={(e) => setCompanyAcr(e.target.value)}
        placeholder="Enter short name (e.g. ABC, HRMS)"
        required
      />

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{editData ? "Update Changes" : "Save"}</Button>
      </div>
    </form>
  );
}
