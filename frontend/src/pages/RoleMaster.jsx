import React, { useEffect, useMemo, useRef, useState } from "react";
import { Shield } from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import API from "../api";
import { useAuth } from "../auth/AuthContext";

import Modal from "../components/ui/Modal";
import MasterHeader from "../components/common/MasterHeader";
import MasterTable from "../components/common/MasterTable";
import ActionButtons from "../components/common/ActionButton";
import RoleForm from "../components/features/masters/RoleForm";

export default function RoleMaster({ selectedCompanyId: incomingSelectedCompanyId }) {
  const { user } = useAuth();
  const currentUserId = user?.userId ?? user?.id ?? "system";
  const role = user?.role || "";
  const isAdmin = role === "Admin";
  const isSuperAdmin = role === "Super Admin";

  const [roles, setRoles] = useState([]);
  const [resolvedCompanyId, setResolvedCompanyId] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const fileInputRef = useRef(null);

  const canAccess = isAdmin || isSuperAdmin;
  const effectiveSelectedCompanyId =
    String(
      incomingSelectedCompanyId ||
        resolvedCompanyId ||
        user?.companyId ||
        user?.company?.companyId ||
        ""
    ) || "";
  const hasCompanyScope = isAdmin || Boolean(effectiveSelectedCompanyId);

  const fetchRoles = async () => {
    try {
      const res = await API.get("/roles");
      setRoles(res.data || []);
    } catch (err) {
      console.error("Error fetching roles:", err);
      toast.error("Could not load roles");
    }
  };

  useEffect(() => {
    if (!canAccess) return;

    const id = setTimeout(() => {
      const load = async () => {
        try {
          if (!incomingSelectedCompanyId && !effectiveSelectedCompanyId && user?.userNumber) {
            const companyRes = await API.get(`/users/getCompany/${user.userNumber}`);
            if (companyRes?.data?.companyId) {
              setResolvedCompanyId(String(companyRes.data.companyId));
            }
          }

          const roleRes = await API.get("/roles");
          setRoles(roleRes.data || []);
        } catch (err) {
          console.error("Error loading Role Master:", err);
          toast.error("Could not load role master data");
        }
      };

      load();
    }, 0);

    return () => clearTimeout(id);
  }, [canAccess, incomingSelectedCompanyId, effectiveSelectedCompanyId, user?.userNumber]);

  const filteredData = useMemo(
    () =>
      roles.filter(
        (r) =>
          r.roleName?.toLowerCase().includes(search.trim().toLowerCase())
      ),
    [roles, search]
  );

  const requireCompanyScope = () => {
    if (!hasCompanyScope) {
      toast.error("Select a company first");
      return false;
    }
    return true;
  };

  const handleSave = async (payload, roleId) => {
    if (!requireCompanyScope()) return;
    try {
      if (roleId) {
        await API.put(`/roles/${roleId}`, payload);
        Swal.fire("Updated!", "Role updated successfully", "success");
      } else {
        await API.post("/roles", payload);
        Swal.fire("Added!", "Role added successfully", "success");
      }
      setShowForm(false);
      setEditData(null);
      fetchRoles();
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.response?.data ||
        "Operation failed";
      Swal.fire("Error", String(msg), "error");
    }
  };

  const handleDelete = (roleId) => {
    if (!requireCompanyScope()) return;

    Swal.fire({
      title: "Are you sure?",
      text: "This action cannot be undone!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await API.delete(`/roles/${roleId}`, {
            data: { updatedBy: currentUserId },
          });
          Swal.fire("Deleted!", "Role has been deleted.", "success");
          fetchRoles();
        } catch (err) {
          console.error("Error deleting role:", err);
          Swal.fire("Error!", "Failed to delete role.", "error");
        }
      }
    });
  };

  const parseCsvLine = (line) => {
    const values = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values.map((v) => v.replace(/^"(.*)"$/, "$1").trim());
  };

  const parseCsvText = (text) => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];

    const headers = parseCsvLine(lines[0]);
    return lines.slice(1).map((line) => {
      const values = parseCsvLine(line);
      return headers.reduce((acc, key, idx) => {
        acc[key] = values[idx] ?? "";
        return acc;
      }, {});
    });
  };

  const handleBulkUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!requireCompanyScope()) return;

    try {
      const text = await file.text();
      const rows = parseCsvText(text);
      if (rows.length === 0) {
        toast.error("CSV file is empty or invalid");
        return;
      }

      const payloads = rows
        .map((row) => ({
          roleName: String(row.roleName || "").trim(),
          createdBy: currentUserId,
          updatedBy: currentUserId,
        }))
        .filter((p) => p.roleName);

      if (payloads.length === 0) {
        toast.error("CSV must contain roleName column");
        return;
      }

      const results = await Promise.allSettled(payloads.map((payload) => API.post("/roles", payload)));
      const successCount = results.filter((r) => r.status === "fulfilled").length;
      const failCount = results.length - successCount;

      if (successCount > 0) fetchRoles();
      if (failCount === 0) {
        Swal.fire("Uploaded!", `${successCount} roles uploaded successfully`, "success");
      } else {
        Swal.fire("Completed with errors", `${successCount} uploaded, ${failCount} failed`, "warning");
      }
    } catch (err) {
      console.error("Bulk upload failed:", err);
      toast.error("Bulk upload failed");
    }
  };

  const downloadSampleTemplate = () => {
    const headers = ["roleName"];
    const sampleRows = [
      ["Admin"],
      ["Department Admin"],
      ["Employee"],
    ];

    const csv = [headers.join(","), ...sampleRows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "role_bulk_upload_template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!canAccess) {
    return (
      <div className="h-full flex items-center justify-center px-6">
        <p className="text-sm text-gray-600">You do not have access to this page.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col px-6">
   

      <MasterHeader
        search={search}
        setSearch={setSearch}
        onAddNew={() => {
          if (!requireCompanyScope()) return;
          setEditData(null);
          setShowForm(true);
        }}
        placeholder="Search role..."
        buttonText="Add Role"
        actions={
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleBulkUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg shadow-sm whitespace-nowrap"
            >
              Upload CSV
            </button>
            <button
              type="button"
              onClick={downloadSampleTemplate}
              className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-lg shadow-sm whitespace-nowrap"
            >
              Download Sample
            </button>
          </>
        }
      />

      {!hasCompanyScope ? (
        <div className="border border-amber-200 bg-amber-50 text-amber-800 rounded-lg p-4 text-sm">
          Select a company before accessing Role Master actions.
        </div>
      ) : (
        <MasterTable columns={["ID", "Role Name", "Actions"]}>
          {filteredData.map((r) => (
            <tr key={r.roleId} className="border-t hover:bg-gray-50">
              <td className="py-3 px-4">{r.roleId}</td>
              <td className="py-3 px-4">{r.roleName}</td>
              <td className="py-3 px-4">
                <ActionButtons
                  onEdit={() => {
                    setEditData(r);
                    setShowForm(true);
                  }}
                  onDelete={() => handleDelete(r.roleId)}
                />
              </td>
            </tr>
          ))}

          {filteredData.length === 0 && (
            <tr>
              <td colSpan={3} className="text-center py-4 text-gray-500">
                No roles found
              </td>
            </tr>
          )}
        </MasterTable>
      )}

      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditData(null);
        }}
        title={editData ? "Edit Role" : "Add New Role"}
        icon={Shield}
      >
        <RoleForm
          editData={editData}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditData(null);
          }}
        />
      </Modal>
    </div>
  );
}
