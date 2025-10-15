import React, { useState, useEffect } from "react";
import axios from "axios";
import { Calendar, Pencil, Trash, Plus, X } from "lucide-react";
import { jwtDecode } from "jwt-decode";
import Swal from "sweetalert2";
import { toast } from "react-toastify";

// Decode JWT token to get userNumber and role
let token = sessionStorage.getItem("token");
let decoded   = (token)?jwtDecode(token):"";
let userNumber = decoded.userNumber || "";

function HolidayPlans({ userRole, selectedCompanyId, selectedCompanyName }) {
  const [holidayPlans, setHolidayPlans] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedHoliday, setSelectedHoliday] = useState(null);
  const [companyId, setCompanyId] = useState(selectedCompanyId); // Admin's companyId
  const [companyName, setCompanyName] = useState(""); // Company name display
  const [companyAcronym, setCompanyAcronym] = useState(""); // Admin's companyAcr
  const [companies, setCompanies] = useState([]); // For Super Admin dropdown
  const [isLoading, setIsLoading] = useState(false);

  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [holidayModalOpen, setHolidayModalOpen] = useState(false);

  const [planForm, setPlanForm] = useState({
    startYear: "",
    endYear: "",
    weeklyOff: [],
    companyId: userRole === "Super Admin" ? selectedCompanyId : companyId,
  });

  const [holidayForm, setHolidayForm] = useState({
    holidayDate: "",
    description: "",
    companyId: userRole === "Super Admin" ? selectedCompanyId : companyId,
  });

  const weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

useEffect(() => {
    token = sessionStorage.getItem("token");
    decoded = token ? jwtDecode(token) : "";
    userNumber = decoded?.userNumber;
  }, []);

  // Fetch companies for Super Admin and Admin's company details
  useEffect(() => {
    let mounted = true;
    const fetchCompanies = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/companies", {
          headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
        });
        if (!mounted) return;
        setCompanies(res.data || []);
        if (userRole === "Super Admin" && selectedCompanyId) {
          setCompanyId(selectedCompanyId);
          const selected = res.data.find((c) => c.companyId === selectedCompanyId);
          setCompanyName(selected ? selected.companyName : selectedCompanyName || "");
        }
      } catch (err) {
        console.error("Error fetching companies:", err);
      }
    };

    const fetchAdminCompany = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/users/byNumber/${userNumber}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!mounted) return;
        setCompanyId(res.data.companyId || "");
        setCompanyName(res.data.companyName || "No company selected");
        setCompanyAcronym(res.data.companyAcr || res.data.companyId || "");
        setPlanForm((prev) => ({ ...prev, companyId: res.data.companyId }));
        setHolidayForm((prev) => ({ ...prev, companyId: res.data.companyId }));
      } catch (err) {
        console.error("Error fetching admin company:", err);
        toast.error("Failed to fetch company details: " + (err.response?.data?.message || err.message));
      }
    };

    const fetchCompanyAcronym = async (compId) => {
      if (!compId) return;
      try {
        const res = await axios.get(`http://localhost:5000/api/companies/${compId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!mounted) return;
        setCompanyAcronym(res.data.companyAcr || compId || "");
        if (!companyName) setCompanyName(res.data.companyName || "No company selected");
      } catch (err) {
        console.error("Error fetching company acronym:", err);
        toast.error("Failed to fetch company details: " + (err.response?.data?.message || err.message));
      }
    };

    if (userRole === "Super Admin") {
      fetchCompanies();
    } else if (userRole === "Admin") {
      if (selectedCompanyId) {
        setCompanyId(selectedCompanyId);
        setCompanyName(selectedCompanyName || "No company selected");
        fetchCompanyAcronym(selectedCompanyId);
        setPlanForm((prev) => ({ ...prev, companyId: selectedCompanyId }));
        setHolidayForm((prev) => ({ ...prev, companyId: selectedCompanyId }));
      } else {
        fetchAdminCompany();
      }
    }
    return () => {
      mounted = false;
    };
  }, [userRole, selectedCompanyId, selectedCompanyName]);

  // Fetch holiday plans when selectedCompanyId changes
  useEffect(() => {
    if (!userNumber) {
      toast.error("User not authenticated. Please log in again.");
      return;
    }
    fetchHolidayPlans(userRole === "Super Admin" ? selectedCompanyId : companyId);
  }, [selectedCompanyId, companyId, userRole]);

  // Fetch holiday plans
  const fetchHolidayPlans = async (companyId) => {
    try {
      setIsLoading(true);
      const url = companyId ? `http://localhost:5000/api/holidayPlans?companyId=${companyId}` : `http://localhost:5000/api/holidayPlans`;
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHolidayPlans(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching holiday plans:", err);
      setHolidayPlans([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch holidays of a specific plan
  const fetchHolidays = async (holidayPlanId) => {
    try {
      setIsLoading(true);
      const effectiveCompanyId = userRole === "Super Admin" ? selectedCompanyId : companyId;
      const url = effectiveCompanyId
        ? `http://localhost:5000/api/holidays/${holidayPlanId}?companyId=${effectiveCompanyId}`
        : `http://localhost:5000/api/holidays/${holidayPlanId}`;
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      console.error("Error fetching holidays:", err);
      toast.error("Failed to fetch holidays: " + (err.response?.data?.message || err.message));
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const toggleWeeklyOff = (day) => {
    setPlanForm((prev) => ({
      ...prev,
      weeklyOff: prev.weeklyOff.includes(day) ? prev.weeklyOff.filter((d) => d !== day) : [...prev.weeklyOff, day],
    }));
  };

  const handleStartYearChange = (e) => {
    const startYear = e.target.value;
    const endYear = startYear ? String(parseInt(startYear) + 1) : "";
    setPlanForm((prev) => ({ ...prev, startYear, endYear }));
  };

  const getCompanyAcronym = (id) => {
    if (userRole === "Admin") return companyAcronym || id || "";
    const company = companies.find((c) => c.companyId == id);
    return company ? company.companyAcr : id || "";
  };

  const handleSavePlan = async () => {
    const startYear = parseInt(planForm.startYear);
    const endYear = parseInt(planForm.endYear);
    const effectiveCompanyId = userRole === "Super Admin" ? planForm.companyId : companyId;

    if (isNaN(startYear) || !startYear) {
      toast.error("Enter a valid start year.");
      return;
    }
    if (endYear !== startYear + 1) {
      toast.error("End year must be exactly 1 year greater than start year.");
      return;
    }
    if (planForm.weeklyOff.length === 0) {
      toast.error("There must be at least one WeeklyOff.");
      return;
    }
    if (!effectiveCompanyId) {
      toast.error("Company ID is required.");
      return;
    }

    const holidayPlanName = `${getCompanyAcronym(effectiveCompanyId)}-${startYear}-${endYear}`;
    const startDate = `${startYear}-06-01`;
    const endDate = `${endYear}-04-30`;

    try {
      setIsLoading(true);
      let plan;
      if (selectedPlan) {
        await axios.put(
          `http://localhost:5000/api/holidayPlans/${selectedPlan.holidayPlanId}`,
          {
            holidayPlanName,
            startDate,
            endDate,
            weeklyOff: planForm.weeklyOff,
            updatedBy: userNumber,
            companyId: effectiveCompanyId,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        plan = selectedPlan;
        toast.success("Holiday plan updated successfully!");
      } else {
        const res = await axios.post(
          "http://localhost:5000/api/holidayPlans",
          {
            holidayPlanName,
            startDate,
            endDate,
            weeklyOff: planForm.weeklyOff,
            createdBy: userNumber,
            companyId: effectiveCompanyId,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        plan = res.data;
        toast.success("Holiday plan created successfully!");
      }

      setPlanModalOpen(false);
      setPlanForm({ startYear: "", endYear: "", weeklyOff: [], companyId: effectiveCompanyId });
      setSelectedPlan(null);
      await fetchHolidayPlans(userRole === "Super Admin" ? selectedCompanyId : companyId);
      await fetchHolidays(plan.holidayPlanId).then(setHolidays);
    } catch (err) {
      console.error("Error creating/updating holiday plan:", err);
      toast.error("Error creating/updating holiday plan: " + (err.response?.data?.message || err.message));
    } finally {
      setPlanModalOpen(false);
      setIsLoading(false);
    }
  };

  const handleDeletePlan = async (id) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "Do you want to delete this holiday plan?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        setIsLoading(true);
        await axios.delete(`http://localhost:5000/api/holidayPlans/${id}`, {
          data: { updatedBy: userNumber },
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Holiday plan deleted successfully!");
        await fetchHolidayPlans(userRole === "Super Admin" ? selectedCompanyId : companyId);
        if (selectedPlan?.holidayPlanId === id) {
          setSelectedPlan(null);
          setHolidays([]);
        }
      } catch (err) {
        console.error("Error deleting holiday plan:", err);
        toast.error("Error deleting holiday plan: " + (err.response?.data?.message || err.message));
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSaveHoliday = async () => {
    const effectiveCompanyId = userRole === "Super Admin" ? holidayForm.companyId : companyId;

    if (!selectedPlan) {
      toast.error("Please select a holiday plan.");
      return;
    }
    if (!effectiveCompanyId) {
      toast.error("Company ID is required.");
      return;
    }
    if (!holidayForm.holidayDate) {
      toast.error("Holiday date is required.");
      return;
    }
    if (!holidayForm.description) {
      toast.error("Holiday description is required.");
      return;
    }

    try {
      setIsLoading(true);
      if (selectedHoliday) {
        await axios.put(
          `http://localhost:5000/api/holidays/${selectedHoliday.holidayId}`,
          {
            holidayPlanId: selectedPlan.holidayPlanId,
            holidayDate: holidayForm.holidayDate,
            description: holidayForm.description,
            updatedBy: userNumber,
            companyId: effectiveCompanyId,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success("Holiday updated successfully!");
      } else {
        await axios.post(
          "http://localhost:5000/api/holidays",
          {
            holidayPlanId: selectedPlan.holidayPlanId,
            holidayDate: holidayForm.holidayDate,
            description: holidayForm.description,
            createdBy: userNumber,
            companyId: effectiveCompanyId,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success("Holiday created successfully!");
      }

      setHolidayModalOpen(false);
      setHolidayForm({ holidayDate: "", description: "", companyId: effectiveCompanyId });
      setSelectedHoliday(null);
      await fetchHolidays(selectedPlan.holidayPlanId).then(setHolidays);
    } catch (err) {
      console.error("Error saving holiday:", err);
      toast.error("Error saving holiday: " + (err.response?.data?.message || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteHoliday = async (id) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "Do you want to delete this holiday?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        setIsLoading(true);
        await axios.delete(`http://localhost:5000/api/holidays/${id}`, {
          data: { updatedBy: userNumber, companyId: userRole === "Super Admin" ? selectedCompanyId : companyId },
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Holiday deleted successfully!");
        await fetchHolidays(selectedPlan.holidayPlanId).then(setHolidays);
      } catch (err) {
        console.error("Error deleting holiday:", err);
        toast.error("Error deleting holiday: " + (err.response?.data?.message || err.message));
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="h-full p-6 flex flex-col space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Holiday Plans</h1>
        <button
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md"
          onClick={() => {
            setSelectedPlan(null);
            setPlanForm({ startYear: "", endYear: "", weeklyOff: [], companyId: userRole === "Super Admin" ? selectedCompanyId : companyId });
            setCompanyName(userRole === "Super Admin" ? selectedCompanyName : companyName);
            setPlanModalOpen(true);
          }}
          disabled={isLoading}
        >
          <Plus size={18} /> Add Holiday Plan
        </button>
      </div>

      {/* Loading Indicator */}
      {isLoading && <div className="text-center text-gray-500">Loading...</div>}

      {/* Holiday Plans Table */}
      <div className="overflow-y-auto border border-gray-200 rounded-lg shadow-sm" style={{ maxHeight: "280px" }}>
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0">
            <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <th className="py-3 px-4">Plan</th>
              <th className="py-3 px-4">Start Date</th>
              <th className="py-3 px-4">End Date</th>
              {userRole === "Super Admin" && <th className="py-3 px-4">Company</th>}
              <th className="py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {holidayPlans.map((plan) => (
              <tr key={plan.holidayPlanId} className="border-t hover:bg-gray-50">
                <td className="py-2 px-4">{plan.holidayPlanName}</td>
                <td className="py-2 px-4">{plan.startDate}</td>
                <td className="py-2 px-4">{plan.endDate}</td>
                {userRole === "Super Admin" && (
                  <td className="py-2 px-4">
                    {plan.companyId === selectedCompanyId ? selectedCompanyName : getCompanyAcronym(plan.companyId)}
                  </td>
                )}
                <td className="py-2 px-4 flex gap-2">
                  <button
                    className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-md"
                    onClick={() => {
                      setPlanForm({
                        startYear: parseInt(plan.startDate.slice(0, 4)),
                        endYear: parseInt(plan.endDate.slice(0, 4)),
                        weeklyOff: plan.weeklyOff || [],
                        companyId: plan.companyId,
                      });
                      setCompanyName(userRole === "Super Admin" ? (companies.find((c) => c.companyId === plan.companyId)?.companyName || plan.companyId) : companyName);
                      setSelectedPlan(plan);
                      setPlanModalOpen(true);
                    }}
                    disabled={isLoading}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-md"
                    onClick={() => handleDeletePlan(plan.holidayPlanId)}
                    disabled={isLoading}
                  >
                    <Trash size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {holidayPlans.length === 0 && !isLoading && (
              <tr>
                <td colSpan={userRole === "Super Admin" ? 5 : 4} className="text-center py-4 text-gray-500">
                  No holiday plans found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Holiday Selection */}
      {holidayPlans.length > 0 && !isLoading && (
        <div>
          <label className="font-semibold mr-2">Select Holiday Plan:</label>
          <select
            value={selectedPlan?.holidayPlanId || ""}
            onChange={(e) => {
              const plan = holidayPlans.find((p) => p.holidayPlanId == e.target.value);
              setSelectedPlan(plan);
              if (!plan) {
                setHolidays([]);
                return;
              }
              fetchHolidays(plan.holidayPlanId).then(setHolidays);
            }}
            className="border px-2 py-2 rounded-lg"
            disabled={isLoading}
          >
            <option value="">-- Select --</option>
            {holidayPlans.map((plan) => (
              <option key={plan.holidayPlanId} value={plan.holidayPlanId}>
                {plan.holidayPlanName}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Holidays of Selected Plan */}
      {selectedPlan && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-semibold">Holidays in {selectedPlan.holidayPlanName}</h2>
            <button
              onClick={() => {
                setHolidayForm({ holidayDate: "", description: "", companyId: userRole === "Super Admin" ? selectedCompanyId : companyId });
                setSelectedHoliday(null);
                setHolidayModalOpen(true);
              }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md"
              disabled={isLoading}
            >
              <Plus size={18} /> Add Holiday
            </button>
          </div>

          <div className="overflow-y-auto border border-gray-200 rounded-lg shadow-sm" style={{ maxHeight: "280px" }}>
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0">
                <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {holidays.map((h) => {
                  const isPast = new Date(h.holidayDate) < new Date();
                  return (
                    <tr key={h.holidayId} className="border-t hover:bg-gray-50">
                      <td className="py-2 px-4">{h.holidayDate}</td>
                      <td className="py-2 px-4">{h.description}</td>
                      <td className="py-2 px-4 flex gap-2">
                        {String(h.holidayId).startsWith("wo-") ? (
                          <span className="text-gray-400">Weekly Off</span>
                        ) : (
                          <>
                            <button
                              className={`p-2 rounded-md ${
                                isPast ? "bg-gray-300 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600 text-white"
                              }`}
                              disabled={isPast || isLoading}
                              onClick={() => {
                                setHolidayForm({
                                  holidayDate: h.holidayDate,
                                  description: h.description,
                                  companyId: h.companyId || (userRole === "Super Admin" ? selectedCompanyId : companyId),
                                });
                                setSelectedHoliday(h);
                                setHolidayModalOpen(true);
                              }}
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              className={`p-2 rounded-md ${
                                isPast ? "bg-gray-300 cursor-not-allowed" : "bg-red-500 hover:bg-red-600 text-white"
                              }`}
                              disabled={isPast || isLoading}
                              onClick={() => handleDeleteHoliday(h.holidayId)}
                            >
                              <Trash size={16} />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {holidays.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan="3" className="text-center py-4 text-gray-500">
                      No holidays found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Holiday Plan Modal */}
      {planModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="relative max-w-xl w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
            <button
              onClick={() => setPlanModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
            >
              <X size={22} />
            </button>

            <div className="flex justify-center mb-6">
              <div className="bg-blue-100 p-4 rounded-full">
                <Calendar className="text-blue-600" size={40} />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">
              {selectedPlan ? "Edit Holiday Plan" : "Add New Holiday Plan"}
            </h2>

            <input
              type="number"
              placeholder="Start Year (e.g., 2025)"
              value={planForm.startYear}
              onChange={handleStartYearChange}
              className="border border-gray-300 rounded-lg p-3 w-full mb-3 focus:ring-2 focus:ring-blue-500 outline-none"
              disabled={isLoading}
            />
            <input
              type="number"
              placeholder="End Year (auto-filled)"
              value={planForm.endYear}
              readOnly
              className="border border-gray-300 rounded-lg p-3 w-full mb-3 focus:ring-2 focus:ring-blue-500 outline-none bg-gray-100"
            />
            <div>
              <label className="block font-medium text-gray-700 mb-2">Company</label>
              {userRole === "Super Admin" ? (
                <select
                  value={planForm.companyId}
                  onChange={(e) => {
                    setPlanForm((prev) => ({ ...prev, companyId: e.target.value }));
                    const selected = companies.find((c) => c.companyId === e.target.value);
                    setCompanyName(selected ? selected.companyName : "");
                  }}
                  disabled={selectedPlan !== null} // Disable when editing
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                >
                  <option value="">Select Company</option>
                  {companies
                    .filter((c) => c.companyId !== 1)
                    .map((c) => (
                      <option key={c.companyId} value={c.companyId}>
                        {c.companyName}
                      </option>
                    ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={companyName || "No company selected"}
                  disabled
                  className="w-full border border-gray-300 rounded-lg p-3 bg-gray-100 cursor-not-allowed"
                />
              )}
            </div>
            <div className="flex flex-wrap gap-4 mb-4">
              {weekDays.map((day) => (
                <label key={day} className="flex items-center gap-2 text-gray-700">
                  <input
                    type="checkbox"
                    checked={planForm.weeklyOff.includes(day)}
                    onChange={() => toggleWeeklyOff(day)}
                    disabled={isLoading}
                  />
                  {day}
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPlanModalOpen(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleSavePlan}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow-md"
                disabled={isLoading}
              >
                {selectedPlan ? "Update Changes" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Holiday Modal */}
      {holidayModalOpen && selectedPlan && (
        <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="relative max-w-xl w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
            <button
              onClick={() => setHolidayModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
            >
              <X size={22} />
            </button>

            <div className="flex justify-center mb-6">
              <div className="bg-blue-100 p-4 rounded-full">
                <Calendar className="text-blue-600" size={40} />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">
              {selectedHoliday ? "Edit Holiday" : "Add New Holiday"}
            </h2>

            <input
              type="date"
              value={holidayForm.holidayDate}
              onChange={(e) => setHolidayForm((prev) => ({ ...prev, holidayDate: e.target.value }))}
              className="border border-gray-300 rounded-lg p-3 w-full mb-3 focus:ring-2 focus:ring-blue-500 outline-none"
              disabled={isLoading}
            />
            <input
              type="text"
              placeholder="Description"
              value={holidayForm.description}
              onChange={(e) => setHolidayForm((prev) => ({ ...prev, description: e.target.value }))}
              className="border border-gray-300 rounded-lg p-3 w-full mb-3 focus:ring-2 focus:ring-blue-500 outline-none"
              disabled={isLoading}
            />
            <input
              type="text"
              placeholder="Company"
              value={userRole === "Super Admin" ? (companyName || "No company selected") : companyName}
              readOnly
              className="border border-gray-300 rounded-lg p-3 w-full mb-3 focus:ring-2 focus:ring-blue-500 outline-none bg-gray-100"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setHolidayModalOpen(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveHoliday}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow-md"
                disabled={isLoading}
              >
                {selectedHoliday ? "Update Changes" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HolidayPlans;