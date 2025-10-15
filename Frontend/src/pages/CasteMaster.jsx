import React, { useState, useEffect } from "react";
import axios from "axios";
import { Users2, Pencil, Trash, Search, Plus } from "lucide-react";
import Swal from 'sweetalert2';
import { toast } from "react-toastify";
import {jwtDecode} from "jwt-decode";
import { useTranslation } from "react-i18next";

let token = sessionStorage.getItem("token");
let decoded = token ? jwtDecode(token) : "";
let userNumber = decoded.userNumber;

function AddOrEdit({ onSave, onCancel, editData }) {
  const { t } = useTranslation();
  const [casteName, setCasteName] = useState(editData?.casteName || "");

  useEffect(() => {
    token = sessionStorage.getItem("token");
    decoded = token ? jwtDecode(token) : "";
    userNumber = decoded?.userNumber;
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!casteName) return toast.error(t("pleaseFillAllFields"));
    const casteData = { casteName };
    onSave(casteData, editData?.casteId);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-100 p-4 rounded-full">
            <Users2 className="text-blue-600" size={40} />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">
          {editData ? t("editCaste") : t("addNewCaste")}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block font-medium text-gray-700 mb-2">{t("casteName")}</label>
            <input
              type="text"
              value={casteName}
              onChange={(e) => setCasteName(e.target.value)}
              placeholder={t("casteName")}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow-md transition"
            >
              {editData ? t("update") : t("save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CasteMaster() {
  const { t } = useTranslation();
  const [castes, setCastes] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);

  const fetchCastes = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/castes");
      setCastes(res.data);
    } catch (err) {
      console.error("Error fetching castes:", err);
      toast.error(t("errorFetchingData"));
    }
  };

  useEffect(() => {
    fetchCastes();
  }, [t]);

  const filteredData = castes.filter((c) =>
    c.casteName?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (casteData, casteId) => {
    try {
      if (casteId) {
        await axios.put(`http://localhost:5000/api/castes/${casteId}`, {
          ...casteData,
          updatedBy: userNumber,
        });
      } else {
        await axios.post("http://localhost:5000/api/castes", {
          ...casteData,
          createdBy: userNumber,
        });
      }
      fetchCastes();
      setShowForm(false);
      setEditData(null);
      Swal.fire({
        icon: "success",
        title: casteId ? t("updated") : t("added"),
        text: t(casteId ? "casteUpdated" : "casteAdded"),
      });
    } catch (err) {
      console.error("Error saving caste:", err);
      Swal.fire({
        icon: "error",
        title: casteId ? t("updateFailed") : t("addFailed"),
        text: err.response?.data?.message || err.message,
      });
    }
  };

  const handleDelete = async (casteId) => {
    Swal.fire({
      title: t("areYouSure"),
      text: t("cannotRevert"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: t("confirmDelete")
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const adminName = sessionStorage.getItem("userNumber");
          await axios.delete(`http://localhost:5000/api/castes/${casteId}`, {
            data: { updatedBy: adminName },
            headers: { Authorization: `Bearer ${token}` },
          });

          Swal.fire({
            title: t("deleted"),
            text: t("casteDeleted"),
            icon: "success",
            timer: 1500,
            showConfirmButton: false
          });

          fetchCastes();
        } catch (err) {
          console.error("Error deleting caste:", err);
          Swal.fire(t("error"), t("failedToDeleteCaste"), "error");
        }
      }
    });
  };

  return showForm ? (
    <AddOrEdit
      onSave={handleSave}
      onCancel={() => {
        setShowForm(false);
        setEditData(null);
      }}
      editData={editData}
    />
  ) : (
    <div className="h-full bg-gray-50 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <div className="relative w-full sm:w-80 mb-4 sm:mb-0">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder={t("searchCaste")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
          />
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditData(null);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg shadow-md transition"
        >
          <Plus size={18} /> {t("addNewCaste")}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
        <div className="max-h-[500px] overflow-y-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0">
              <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <th className="py-3 px-4 text-left font-semibold">{t("id")}</th>
                <th className="py-3 px-4 text-left font-semibold">{t("casteNameHeader")}</th>
                <th className="py-3 px-4 text-center font-semibold">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.length > 0 ? (
                filteredData.map((c) => (
                  <tr key={c.casteId} className="hover:bg-gray-50 transition">
                    <td className="py-3 px-4 font-medium text-gray-800">
                      {c.casteId}
                    </td>
                    <td className="py-3 px-4 text-gray-700">{c.casteName}</td>
                    <td className="py-3 px-4 flex justify-center gap-2">
                      <button
                        className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-md shadow"
                        onClick={() => handleEdit(c)}
                        title={t("edit")}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-md shadow"
                        onClick={() => handleDelete(c.casteId)}
                        title={t("delete")}
                      >
                        <Trash size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="py-16 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <Users2 size={40} className="text-gray-400 mb-3" />
                      <p className="font-medium">{t("noCastesFound")}</p>
                      <p className="text-sm text-gray-400 mt-1">
                        {t("adjustSearchOrAddCaste")}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default CasteMaster;