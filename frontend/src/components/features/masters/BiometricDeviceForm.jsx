import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import Button from "../../../components/ui/Button";
import API from "../../../api";
import { useAuth } from "../../../auth/AuthContext";

export default function BiometricDeviceForm({
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

  const [name, setName] = useState(editData?.name || "");
  const [deviceIp, setDeviceIp] = useState(editData?.deviceIp || "");
  const [location, setLocation] = useState(editData?.location || "");
  const [status, setStatus] = useState(editData?.status || "Active");
  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState(
    typeof editData?.isAutoSyncEnabled === "boolean" ? editData.isAutoSyncEnabled : true
  );
  const [companyId, setCompanyId] = useState(
    editData?.companyId || (!isSuperAdmin ? selectedCompanyId : "")
  );
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    const id = setTimeout(() => {
      setCompanyId(editData?.companyId || (!isSuperAdmin ? selectedCompanyId : ""));
      setStatus(editData?.status || "Active");
      setIsAutoSyncEnabled(
        typeof editData?.isAutoSyncEnabled === "boolean" ? editData.isAutoSyncEnabled : true
      );
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

    if (!name.trim()) return toast.error("Device Name is required");
    if (!deviceIp.trim()) return toast.error("Device IP is required");
    if (!location.trim()) return toast.error("Location is required");
    if (isSuperAdmin && !companyId) return toast.error("Please select a company");

    const payload = {
      name: name.trim(),
      deviceIp: deviceIp.trim(),
      location: location.trim(),
      status: status || "Active",
      isAutoSyncEnabled,
      companyId: companyId || selectedCompanyId || 1,
      createdBy: editData?.createdBy || currentUserId,
      updatedBy: currentUserId,
    };

    onSave(payload, editData?.deviceId);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Device Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter device name"
          required
        />

        <Input
          label="Device IP"
          value={deviceIp}
          onChange={(e) => setDeviceIp(e.target.value)}
          placeholder="Enter IP address"
          required
        />
      </div>

      <Input
        label="Location"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Enter device location"
        required
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: "Active", label: "Active" },
            { value: "Inactive", label: "Inactive" },
            { value: "Maintenance", label: "Maintenance" },
            { value: "Offline", label: "Offline" },
          ]}
        />

        <Select
          label="Auto Sync"
          value={isAutoSyncEnabled ? "true" : "false"}
          onChange={(e) => setIsAutoSyncEnabled(e.target.value === "true")}
          options={[
            { value: "true", label: "Enabled" },
            { value: "false", label: "Disabled" },
          ]}
        />
      </div>

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

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{editData ? "Update Changes" : "Save"}</Button>
      </div>
    </form>
  );
}
