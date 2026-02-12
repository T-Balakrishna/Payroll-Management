import React, { useState } from "react";
import { toast } from "react-toastify";
import Input from "../../ui/Input";
import Button from "../../ui/Button";
import Select from "../../ui/Select";
import { useAuth } from "../../../auth/AuthContext";

export default function RoleForm({ editData, onSave, onCancel }) {
  const { user } = useAuth();
  const currentUserId = user?.userId ?? user?.id ?? "system";

  const [roleName, setRoleName] = useState(editData?.roleName || "");
  const [status, setStatus] = useState(editData?.status || "Active");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!roleName.trim()) return toast.error("Role Name is required");

    const payload = {
      roleName: roleName.trim(),
      status: status || "Active",
      createdBy: editData?.createdBy || currentUserId,
      updatedBy: currentUserId,
    };

    onSave(payload, editData?.roleId);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        label="Role Name"
        value={roleName}
        onChange={(e) => setRoleName(e.target.value)}
        placeholder="Enter role name"
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
