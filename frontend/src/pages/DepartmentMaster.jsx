import React, { useState, useEffect, useRef } from "react";
import { Building2 } from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import API from "../api";
import { useAuth } from "../auth/AuthContext";

import Modal from "../components/ui/Modal";
import MasterHeader from "../components/common/MasterHeader";
import MasterTable from "../components/common/MasterTable";
import ActionButtons from "../components/common/ActionButton";

import DepartmentForm from "../components/features/masters/DepartmentForm";

export default function DepartmentMaster({ userRole, selectedCompanyId, selectedCompanyName }) {
  const { user } = useAuth();
  const normalizeRole = (role) => String(role || "").replace(/\s+/g, "").toLowerCase();
  const isSuperAdmin = normalizeRole(userRole) === "superadmin";
  const currentUserId = user?.userId ?? user?.id ?? "system";
  const [departments, setDepartments] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [bulkCompanyId, setBulkCompanyId] = useState(selectedCompanyId || "");
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await API.get("/companies");
        setCompanies(res.data || []);
      } catch (err) {
        console.error("Error fetching companies:", err);
      }
    };
    fetchCompanies();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await API.get("/departments", {
        params: selectedCompanyId ? { companyId: selectedCompanyId } : {},
      });
      let data = res.data || [];
      if (selectedCompanyId) {
        data = data.filter((d) => String(d.companyId) === String(selectedCompanyId));
      }
      data = data
        .map((d) => ({
          ...d,
          status: d.deletedAt ? "Inactive" : d.status,
        }))
        .filter((d) => String(d.status || "").trim().toLowerCase() === "active");
      setDepartments(data);
    } catch (err) {
      console.error("Error fetching departments:", err);
      toast.error("Could not load departments");
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, [selectedCompanyId]);

  useEffect(() => {
    if (!isSuperAdmin) {
      setBulkCompanyId(selectedCompanyId || "");
    }
  }, [isSuperAdmin, selectedCompanyId]);

  const filteredData = departments.filter(
    (d) =>
      d.departmentName?.toLowerCase().includes(search.trim().toLowerCase()) ||
      d.departmentAcr?.toLowerCase().includes(search.trim().toLowerCase()) ||
      d.status?.toLowerCase().includes(search.trim().toLowerCase())
  );

  const handleSave = async (payload, departmentId) => {
    try {
      if (departmentId) {
        await API.put(`/departments/${departmentId}`, payload);
        Swal.fire("Updated!", "Department updated successfully", "success");
      } else {
        await API.post("/departments", payload);
        Swal.fire("Added!", "Department added successfully", "success");
      }
      setShowForm(false);
      setEditData(null);
      fetchDepartments();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || "Operation failed";
      const text = msg.includes("Validation error") ? "Department already exists in this company" : msg;
      Swal.fire("Error", text, "error");
    }
  };

  const handleEdit = async (department) => {
    let companyName = selectedCompanyName || "";
    if (companies.length > 0) {
      const company = companies.find((c) => c.companyId === department.companyId);
      if (company) companyName = company.companyName;
    }
    setEditData({ ...department, companyName });
    setShowForm(true);
  };

  const handleDelete = (departmentId) => {
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
          await API.delete(`/departments/${departmentId}`, {
            data: { updatedBy: currentUserId },
          });
          Swal.fire("Updated!", "Department marked as inactive.", "success");
          fetchDepartments();
        } catch (err) {
          Swal.fire("Error!", "Failed to delete department.", "error");
        }
      }
    });
  };

  const getCompanyAcronym = (id) => {
    return companies.find((c) => c.companyId === id)?.companyAcr || "";
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

  const normalizeStatus = (rawStatus) => {
    const value = String(rawStatus || "").trim().toLowerCase();
    if (value === "inactive") return "Inactive";
    if (value === "archived") return "Archived";
    return "Active";
  };

  const handleBulkUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const adminCompanyId = String(selectedCompanyId || user?.companyId || "").trim();
    const fallbackSuperAdminCompanyId = String(bulkCompanyId || selectedCompanyId || "").trim();

    if (!isSuperAdmin && !adminCompanyId) {
      toast.error("Admin company not found for bulk upload");
      return;
    }

    try {
      const text = await file.text();
      const rows = parseCsvText(text);
      if (rows.length === 0) {
        toast.error("CSV file is empty or invalid");
        return;
      }

      const companyIdByName = new Map(
        companies.map((c) => [String(c.companyName || "").trim().toLowerCase(), String(c.companyId)])
      );
      const companyIdByAcr = new Map(
        companies.map((c) => [String(c.companyAcr || "").trim().toLowerCase(), String(c.companyId)])
      );

      const payloads = rows
        .map((row) => {
          const rowCompanyName = String(row.companyName || "").trim().toLowerCase();
          const rowCompanyAcr = String(row.companyAcr || "").trim().toLowerCase();
          const resolvedCompanyId = isSuperAdmin
            ? companyIdByName.get(rowCompanyName) ||
              companyIdByAcr.get(rowCompanyAcr) ||
              fallbackSuperAdminCompanyId
            : adminCompanyId;

          return {
            departmentName: String(row.departmentName || "").trim(),
            departmentAcr: String(row.departmentAcr || "").trim().toUpperCase(),
            status: normalizeStatus(row.status),
            companyId: resolvedCompanyId,
            createdBy: currentUserId,
            updatedBy: currentUserId,
          };
        })
        .filter((p) => p.departmentName && p.departmentAcr && String(p.companyId || "").trim());

      if (payloads.length === 0) {
        toast.error(
          isSuperAdmin
            ? "CSV must contain departmentName, departmentAcr, and valid companyName/companyAcr (or choose company from dropdown)"
            : "CSV must contain departmentName and departmentAcr columns"
        );
        return;
      }

      const results = await Promise.allSettled(payloads.map((payload) => API.post("/departments", payload)));
      const successCount = results.filter((r) => r.status === "fulfilled").length;
      const failCount = results.length - successCount;

      if (successCount > 0) fetchDepartments();
      if (failCount === 0) {
        Swal.fire("Uploaded!", `${successCount} departments uploaded successfully`, "success");
      } else {
        Swal.fire("Completed with errors", `${successCount} uploaded, ${failCount} failed`, "warning");
      }
    } catch (err) {
      console.error("Bulk upload failed:", err);
      toast.error("Bulk upload failed");
    }
  };

  const downloadSampleTemplate = () => {
    const headers = isSuperAdmin
      ? ["departmentName", "departmentAcr", "status", "companyName", "companyAcr"]
      : ["departmentName", "departmentAcr", "status"];
    const sampleRows = isSuperAdmin
      ? [
          ["xx", "yy", "active", "xx", ""],
          ["xx", "yy", "inactive", "", "yy"],
        ]
      : [
          ["xx", "yy", "active"],
          ["xx", "yy", "inactive"],
        ];

    const csv = [headers.join(","), ...sampleRows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "department_bulk_upload_template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col px-6">
      <MasterHeader
        search={search}
        setSearch={setSearch}
        onAddNew={() => {
          setEditData(null);
          setShowForm(true);
        }}
        placeholder="Search department..."
        buttonText="Add Department"
        actions={
          <>
            {isSuperAdmin && !selectedCompanyId && (
              <select
                value={bulkCompanyId}
                onChange={(e) => setBulkCompanyId(e.target.value)}
                className="h-10 min-w-48 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Select company</option>
                {companies.map((company) => (
                  <option key={company.companyId} value={company.companyId}>
                    {company.companyName}
                  </option>
                ))}
              </select>
            )}
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

      <MasterTable
        columns={["Name", "Acronym", "Status", ...(!selectedCompanyId ? ["Company"] : []), "Actions"]}
      >
        {filteredData.map((d) => (
          <tr key={d.departmentId} className="border-t hover:bg-gray-50">
            <td className="py-3 px-4">{d.departmentName}</td>
            <td className="py-3 px-4">{d.departmentAcr}</td>
            <td className="py-3 px-4">{d.status}</td>
            {!selectedCompanyId && <td className="py-3 px-4">{getCompanyAcronym(d.companyId)}</td>}
            <td className="py-3 px-4">
              <ActionButtons
                onEdit={() => handleEdit(d)}
                onDelete={() => handleDelete(d.departmentId)}
              />
            </td>
          </tr>
        ))}
      </MasterTable>

      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditData(null);
        }}
        title={editData ? "Edit Department" : "Add New Department"}
        icon={Building2}
      >
        <DepartmentForm
          editData={editData}
          userRole={userRole}
          selectedCompanyId={selectedCompanyId}
          selectedCompanyName={selectedCompanyName}
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