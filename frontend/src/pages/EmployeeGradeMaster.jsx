import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { List } from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import API from "../api";
import { useAuth } from "../auth/AuthContext";

import Modal from "../components/ui/Modal";
import MasterHeader from "../components/common/MasterHeader";
import MasterTable from "../components/common/MasterTable";
import ActionButtons from "../components/common/ActionButton";
import EmployeeGradeForm from "../components/features/masters/EmployeeGradeForm";

export default function EmployeeGradeMaster({ userRole, selectedCompanyId, selectedCompanyName }) {
  const { user } = useAuth();
  const normalizeRole = (role) => String(role || "").replace(/\s+/g, "").toLowerCase();
  const isSuperAdmin = normalizeRole(userRole || user?.role) === "superadmin";
  const currentUserId = user?.userId ?? user?.id ?? "system";

  const [grades, setGrades] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [bulkCompanyId, setBulkCompanyId] = useState(selectedCompanyId || "");
  const fileInputRef = useRef(null);

  const effectiveSelectedCompanyId =
    selectedCompanyId || user?.companyId || user?.company?.companyId || "";
  const hasCompanyScope = Boolean(effectiveSelectedCompanyId);

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

  useEffect(() => {
    if (!isSuperAdmin) {
      setBulkCompanyId(selectedCompanyId || "");
    }
  }, [isSuperAdmin, selectedCompanyId]);

  const fetchGrades = useCallback(async () => {
    if (!hasCompanyScope) {
      setGrades([]);
      return;
    }

    try {
      const res = await API.get("/employeeGrades", {
        params: { companyId: effectiveSelectedCompanyId },
      });
      setGrades(res.data || []);
    } catch (err) {
      console.error("Error fetching employee grades:", err);
      toast.error("Could not load employee grades");
    }
  }, [effectiveSelectedCompanyId, hasCompanyScope]);

  useEffect(() => {
    const id = setTimeout(() => {
      fetchGrades();
    }, 0);
    return () => clearTimeout(id);
  }, [fetchGrades]);

  const filteredData = useMemo(
    () =>
      grades.filter(
        (g) =>
          g.employeeGradeName?.toLowerCase().includes(search.trim().toLowerCase()) ||
          g.employeeGradeAcr?.toLowerCase().includes(search.trim().toLowerCase())
      ),
    [grades, search]
  );

  const handleSave = async (payload, employeeGradeId) => {
    if (!hasCompanyScope) return toast.error("Select a company first");

    try {
      if (employeeGradeId) {
        await API.put(`/employeeGrades/${employeeGradeId}`, payload);
        Swal.fire("Updated!", "Employee grade updated successfully", "success");
      } else {
        await API.post("/employeeGrades", payload);
        Swal.fire("Added!", "Employee grade added successfully", "success");
      }
      setShowForm(false);
      setEditData(null);
      fetchGrades();
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.response?.data ||
        "Operation failed";
      Swal.fire("Error", String(msg), "error");
    }
  };

  const handleDelete = (employeeGradeId) => {
    if (!hasCompanyScope) return toast.error("Select a company first");

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
          await API.delete(`/employeeGrades/${employeeGradeId}`, {
            data: { updatedBy: currentUserId },
          });
          Swal.fire("Deleted!", "Employee grade has been deleted.", "success");
          fetchGrades();
        } catch (err) {
          console.error("Error deleting employee grade:", err);
          Swal.fire("Error!", "Failed to delete employee grade.", "error");
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

    const adminCompanyId = String(effectiveSelectedCompanyId || "").trim();
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
            employeeGradeName: String(row.employeeGradeName || "").trim(),
            employeeGradeAcr: String(row.employeeGradeAcr || "").trim().toUpperCase(),
            companyId: resolvedCompanyId,
            createdBy: currentUserId,
            updatedBy: currentUserId,
          };
        })
        .filter((p) => p.employeeGradeName && p.employeeGradeAcr && String(p.companyId || "").trim());

      if (payloads.length === 0) {
        toast.error(
          isSuperAdmin
            ? "CSV must contain employeeGradeName, employeeGradeAcr, and valid companyName/companyAcr (or choose company from dropdown)"
            : "CSV must contain employeeGradeName and employeeGradeAcr columns"
        );
        return;
      }

      const results = await Promise.allSettled(
        payloads.map((payload) => API.post("/employeeGrades", payload))
      );
      const successCount = results.filter((r) => r.status === "fulfilled").length;
      const failCount = results.length - successCount;

      if (successCount > 0) fetchGrades();
      if (failCount === 0) {
        Swal.fire("Uploaded!", `${successCount} employee grades uploaded successfully`, "success");
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
      ? ["employeeGradeName", "employeeGradeAcr", "companyName", "companyAcr"]
      : ["employeeGradeName", "employeeGradeAcr"];
    const sampleRows = isSuperAdmin
      ? [
          ["Grade A - Senior", "GA", "Acme Private Limited", ""],
          ["Grade B - Junior", "GB", "", "APL"],
        ]
      : [
          ["Grade A - Senior", "GA"],
          ["Grade B - Junior", "GB"],
        ];

    const csv = [headers.join(","), ...sampleRows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "employee_grade_bulk_upload_template.csv";
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
          if (!hasCompanyScope) return toast.error("Select a company first");
          setEditData(null);
          setShowForm(true);
        }}
        placeholder="Search employee grade..."
        buttonText="Add Employee Grade"
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

      {!hasCompanyScope && (
        <div className="border border-amber-200 bg-amber-50 text-amber-800 rounded-lg p-4 text-sm mb-4">
          Select a company before accessing Employee Grade Master actions.
        </div>
      )}

      <MasterTable columns={["Name", "Acronym", "Actions"]}>
        {filteredData.map((g) => (
          <tr key={g.employeeGradeId} className="border-t hover:bg-gray-50">
            <td className="py-3 px-4">{g.employeeGradeName}</td>
            <td className="py-3 px-4">{g.employeeGradeAcr}</td>
            <td className="py-3 px-4">
              <ActionButtons
                onEdit={() => {
                  setEditData(g);
                  setShowForm(true);
                }}
                onDelete={() => handleDelete(g.employeeGradeId)}
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
        title={editData ? "Edit Employee Grade" : "Add New Employee Grade"}
        icon={List}
      >
        <EmployeeGradeForm
          editData={editData}
          userRole={userRole || user?.role}
          selectedCompanyId={effectiveSelectedCompanyId}
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
