import React, { useEffect, useRef, useState } from "react";
import { Building2 } from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import API from "../api";
import { useAuth } from "../auth/AuthContext";

import Modal from "../components/ui/Modal";
import MasterHeader from "../components/common/MasterHeader";
import MasterTable from "../components/common/MasterTable";
import ActionButtons from "../components/common/ActionButton";
import CompanyForm from "../components/features/masters/CompanyForm";

export default function CompanyMaster() {
  const { user } = useAuth();
  const currentUserId = user?.userId ?? user?.id ?? null;
  const isSuperAdmin = user?.role === "Super Admin";

  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const fileInputRef = useRef(null);

  const fetchCompanies = async () => {
    try {
      const res = await API.get("/companies");
      setCompanies(res.data || []);
    } catch (err) {
      console.error("Error fetching companies:", err);
      toast.error("Could not load companies");
    }
  };

  useEffect(() => {
    if (!isSuperAdmin) return;

    const id = setTimeout(() => {
      fetchCompanies();
    }, 0);

    return () => clearTimeout(id);
  }, [isSuperAdmin]);

  const filteredData = companies.filter(
    (c) =>
      c.companyName?.toLowerCase().includes(search.trim().toLowerCase()) ||
      c.companyAcr?.toLowerCase().includes(search.trim().toLowerCase())
  );

  const handleSave = async (payload, companyId) => {
    try {
      if (companyId) {
        await API.put(`/companies/${companyId}`, payload);
        Swal.fire("Updated!", "Company updated successfully", "success");
      } else {
        await API.post("/companies", payload);
        Swal.fire("Added!", "Company added successfully", "success");
      }

      setShowForm(false);
      setEditData(null);
      fetchCompanies();
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.response?.data ||
        "Operation failed";
      Swal.fire("Error", String(msg), "error");
    }
  };

  const handleDelete = (companyId) => {
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
          await API.delete(`/companies/${companyId}`, {
            data: { updatedBy: currentUserId },
          });
          Swal.fire("Deleted!", "Company has been deleted.", "success");
          fetchCompanies();
        } catch (err) {
          console.error("Error deleting company:", err);
          Swal.fire("Error!", "Failed to delete company.", "error");
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

  const toNullable = (value) => {
    const parsed = String(value || "").trim();
    return parsed ? parsed : null;
  };

  const parseAddresses = (rawValue) => {
    const text = String(rawValue || "").trim();
    if (!text) return {};
    try {
      const parsed = JSON.parse(text);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (err) {
      return null;
    }
  };

  const handleBulkUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      const rows = parseCsvText(text);
      if (rows.length === 0) {
        toast.error("CSV file is empty or invalid");
        return;
      }

      const payloads = [];
      let invalidRows = 0;

      rows.forEach((row) => {
        const companyName = String(row.companyName || "").trim();
        const companyAcr = String(row.companyAcr || "").trim().toUpperCase();
        const parsedAddresses = parseAddresses(row.addresses);

        if (!companyName || !companyAcr || parsedAddresses === null) {
          invalidRows += 1;
          return;
        }

        const permissionHoursRaw = String(row.permissionHoursPerMonth || "").trim();
        const permissionHoursPerMonth = permissionHoursRaw
          ? Number.parseInt(permissionHoursRaw, 10)
          : 0;

        payloads.push({
          companyName,
          companyAcr,
          status: "Active",
          registrationNumber: toNullable(row.registrationNumber),
          pan: toNullable(row.pan),
          gst: toNullable(row.gst),
          tin: toNullable(row.tin),
          phone: toNullable(row.phone),
          email: toNullable(row.email),
          website: toNullable(row.website),
          addresses: parsedAddresses,
          bankName: toNullable(row.bankName),
          bankAccountNumber: toNullable(row.bankAccountNumber),
          bankIfscCode: toNullable(row.bankIfscCode),
          financialYearStart: toNullable(row.financialYearStart),
          financialYearEnd: toNullable(row.financialYearEnd),
          permissionHoursPerMonth: Number.isNaN(permissionHoursPerMonth) ? 0 : permissionHoursPerMonth,
          createdBy: currentUserId,
          updatedBy: currentUserId,
        });
      });

      if (payloads.length === 0) {
        toast.error("CSV must contain valid companyName, companyAcr and addresses JSON");
        return;
      }

      const results = await Promise.allSettled(payloads.map((payload) => API.post("/companies", payload)));
      const successCount = results.filter((r) => r.status === "fulfilled").length;
      const failCount = results.length - successCount;

      if (successCount > 0) fetchCompanies();

      const suffix = invalidRows > 0 ? `, ${invalidRows} skipped (invalid rows)` : "";
      if (failCount === 0) {
        Swal.fire("Uploaded!", `${successCount} companies uploaded successfully${suffix}`, "success");
      } else {
        Swal.fire("Completed with errors", `${successCount} uploaded, ${failCount} failed${suffix}`, "warning");
      }
    } catch (err) {
      console.error("Bulk upload failed:", err);
      toast.error("Bulk upload failed");
    }
  };

  const csvValue = (value) => {
    const text = String(value ?? "");
    if (/[",\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const downloadSampleTemplate = () => {
    const headers = [
      "companyName",
      "companyAcr",
      "registrationNumber",
      "pan",
      "gst",
      "tin",
      "phone",
      "email",
      "website",
      "addresses",
      "bankName",
      "bankAccountNumber",
      "bankIfscCode",
      "financialYearStart",
      "financialYearEnd",
      "permissionHoursPerMonth",
    ];

    const sampleRows = [
      [
        "xx",
        "yy",
        "xx",
        "xx",
        "xx",
        "xx",
        "9999999999",
        "xx@yy.com",
        "https://xx.com",
        '{"registered":"xx","branch":"yy"}',
        "xx",
        "1234567890",
        "ABCD0000001",
        "2026-04-01",
        "2027-03-31",
        "8",
      ],
      [
        "xx",
        "yy",
        "yy",
        "yy",
        "yy",
        "yy",
        "8888888888",
        "yy@xx.com",
        "https://yy.com",
        '{"registered":"yy","branch":"xx"}',
        "yy",
        "9876543210",
        "WXYZ0000002",
        "2026-04-01",
        "2027-03-31",
        "10",
      ],
    ];

    const csv = [
      headers.join(","),
      ...sampleRows.map((row) => row.map(csvValue).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "company_bulk_upload_template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isSuperAdmin) {
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
          setEditData(null);
          setShowForm(true);
        }}
        placeholder="Search company..."
        buttonText="Add Company"
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

      <MasterTable columns={["ID", "Name", "Acronym", "Actions"]}>
        {filteredData.map((c) => (
          <tr key={c.companyId} className="border-t hover:bg-gray-50">
            <td className="py-3 px-4">{c.companyId}</td>
            <td className="py-3 px-4">{c.companyName}</td>
            <td className="py-3 px-4">{c.companyAcr}</td>
            <td className="py-3 px-4">
              <ActionButtons
                onEdit={() => {
                  setEditData(c);
                  setShowForm(true);
                }}
                onDelete={() => handleDelete(c.companyId)}
              />
            </td>
          </tr>
        ))}

        {filteredData.length === 0 && (
          <tr>
            <td colSpan={4} className="text-center py-4 text-gray-500">
              No companies found
            </td>
          </tr>
        )}
      </MasterTable>

      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditData(null);
        }}
        title={editData ? "Edit Company" : "Add New Company"}
        icon={Building2}
        maxWidth="max-w-6xl"
      >
        <CompanyForm
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
