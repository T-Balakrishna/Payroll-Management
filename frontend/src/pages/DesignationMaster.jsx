import React, { useState, useEffect } from "react";
import axios from "axios";
import { User, Pencil, Trash2 } from "lucide-react"; // Changed icon to User (or choose Briefcase, Users, etc.)
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { jwtDecode } from "jwt-decode";

import Modal from "../components/ui/Modal";
import MasterHeader from "../components/common/MasterHeader";
import MasterTable from "../components/common/MasterTable";
import ActionButtons from "../components/common/ActionButton";

import DesignationForm from "../components/features/masters/designation/DesignationForm"; // ← adjust path if needed

let token = sessionStorage.getItem("token");
let userNumber = token ? jwtDecode(token)?.userNumber : "system";

export default function DesignationMaster({ userRole, selectedCompanyId, selectedCompanyName }) {
  const [designations, setDesignations] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/companies", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCompanies(res.data || []);
      } catch (err) {
        console.error("Error fetching companies:", err);
      }
    };
    fetchCompanies();
  }, []);

  const fetchDesignations = async () => {
    try {
      let url = "http://localhost:5000/api/designations";
      if (selectedCompanyId) url += `?companyId=${selectedCompanyId}`;
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      let data = res.data || [];
      if (selectedCompanyId) {
        data = data.filter((d) => String(d.companyId) === String(selectedCompanyId));
      }
      setDesignations(data);
    } catch (err) {
      console.error("Error fetching designations:", err);
      toast.error("Could not load designations");
    }
  };

  useEffect(() => {
    fetchDesignations();
  }, [selectedCompanyId]);

  const filteredData = designations.filter(
    (d) =>
      d.designationName?.toLowerCase().includes(search.trim().toLowerCase()) ||
      d.designationAcr?.toLowerCase().includes(search.trim().toLowerCase()) ||
      d.status?.toLowerCase().includes(search.trim().toLowerCase())
  );

  const handleSave = async (payload, designationId) => {
    try {
      if (designationId) {
        await axios.put(`http://localhost:5000/api/designations/${designationId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        Swal.fire("Updated!", "Designation updated successfully", "success");
      } else {
        await axios.post("http://localhost:5000/api/designations", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        Swal.fire("Added!", "Designation added successfully", "success");
      }
      setShowForm(false);
      setEditData(null);
      fetchDesignations();
    } catch (err) {
      const msg = err.response?.data || "Operation failed";
      const text = msg.includes("Validation error") 
        ? "Designation already exists in this company" 
        : msg;
      Swal.fire("Error", text, "error");
    }
  };

  const handleEdit = async (designation) => {
    let companyName = selectedCompanyName || "";
    if (companies.length > 0) {
      const company = companies.find((c) => c.companyId === designation.companyId);
      if (company) companyName = company.companyName;
    }
    setEditData({ ...designation, companyName });
    setShowForm(true);
  };

  const handleDelete = (designationId) => {
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
          await axios.delete(`http://localhost:5000/api/designations/${designationId}`, {
            data: { updatedBy: userNumber },
            headers: { Authorization: `Bearer ${token}` },
          });
          Swal.fire("Deleted!", "Designation has been deleted.", "success");
          fetchDesignations();
        } catch (err) {
          Swal.fire("Error!", "Failed to delete designation.", "error");
        }
      }
    });
  };

  const getCompanyAcronym = (id) => {
    return companies.find((c) => c.companyId === id)?.companyAcr || "";
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
        placeholder="Search designation..."
        buttonText="Add Designation"
      />

      <MasterTable
        columns={["Name", "Acronym", ...(!selectedCompanyId ? ["Company"] : []), "Actions"]}
      >
        {filteredData.map((d) => (
          <tr key={d.designationId} className="border-t hover:bg-gray-50">
            <td className="py-3 px-4">{d.designationName}</td>
            <td className="py-3 px-4">{d.designationAcr}</td>
            {!selectedCompanyId && <td className="py-3 px-4">{getCompanyAcronym(d.companyId)}</td>}
            <td className="py-3 px-4">
              <ActionButtons
                onEdit={() => handleEdit(d)}
                onDelete={() => handleDelete(d.designationId)}
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
        title={editData ? "Edit Designation" : "Add New Designation"}
        icon={User}  // ← changed from Building2
      >
        <DesignationForm
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