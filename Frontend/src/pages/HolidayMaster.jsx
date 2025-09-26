import React, { useState, useEffect } from "react";
import axios from "axios";
import { Calendar, Pencil, Trash, Plus, X } from "lucide-react";

function HolidayPlans() {
  const [holidayPlans, setHolidayPlans] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedHoliday, setSelectedHoliday] = useState(null);

  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [holidayModalOpen, setHolidayModalOpen] = useState(false);

  const user = sessionStorage.getItem("userNumber");
  const [planForm, setPlanForm] = useState({
    startYear: "",
    endYear: "",
    weeklyOff: [],
  });

  const [holidayForm, setHolidayForm] = useState({
    holidayDate: "",
    description: "",
  });

  const weekDays = [
    "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
  ];

  useEffect(() => {
    fetchHolidayPlans();
  }, []);

  // Fetch all holiday plans
  const fetchHolidayPlans = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/holidayPlans");
      setHolidayPlans(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching holiday plans:", err);
    }
  };

  // Fetch holidays of a specific plan
  const fetchHolidays = async (holidayPlanId) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/holidays/${holidayPlanId}`);
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      console.error("Error fetching holidays:", err);
      return [];
    }
  };

  const toggleWeeklyOff = (day) => {
    setPlanForm((prev) => ({
      ...prev,
      weeklyOff: prev.weeklyOff.includes(day)
        ? prev.weeklyOff.filter((d) => d !== day)
        : [...prev.weeklyOff, day],
    }));
  };

  // Save or update Holiday Plan
  const handleSavePlan = async () => {
    const startYear = parseInt(planForm.startYear);
    const endYear = parseInt(planForm.endYear);

    if (isNaN(startYear) || isNaN(endYear)) return alert("Enter valid years.");
    if (endYear !== startYear + 1) return alert("End year must be exactly 1 year greater than start year.");
    if (planForm.weeklyOff.length === 0) return alert("There must be at least one WeeklyOff");

    const holidayPlanName = `${startYear}-${endYear}`;
    const startDate = `${startYear}-06-01`;
    const endDate = `${endYear}-04-30`;

    try {
      let plan;
      if (selectedPlan) {
        await axios.put(`http://localhost:5000/api/holidayPlans/${selectedPlan.holidayPlanId}`, {
          holidayPlanName,
          startDate,
          endDate,
          weeklyOff: planForm.weeklyOff,
          updatedBy: user,
        });
        plan = selectedPlan;
      } else {
        const res = await axios.post("http://localhost:5000/api/holidayPlans", {
          holidayPlanName,
          startDate,
          endDate,
          weeklyOff: planForm.weeklyOff,
          createdBy: user,
        });
        plan = res.data;
      }

      setPlanModalOpen(false);
      setPlanForm({ startYear: "", endYear: "", weeklyOff: [] });
      setSelectedPlan(null);

      fetchHolidayPlans();
      fetchHolidays(plan.holidayPlanId).then(setHolidays);
    } catch (err) {

      alert("Error creating/updating holiday plan:", err)
      setPlanForm({ startYear: "", endYear: "", weeklyOff: [] });
      setPlanModalOpen(false);
      console.error("Error creating/updating holiday plan:", err);
    }
  };

  // Delete Holiday Plan
  const handleDeletePlan = async (id) => {
    if (!window.confirm("Are you sure you want to delete this plan?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/holidayPlans/${id}`, {
        data: { updatedBy: user },
      });
      fetchHolidayPlans();
      if (selectedPlan?.holidayPlanId === id) {
        setSelectedPlan(null);
        setHolidays([]);
      }
    } catch (err) {
      console.error("Error deleting holiday plan:", err);
    }
  };

  // Save or update Holiday
  const handleSaveHoliday = async () => {
    if (!selectedPlan) return;
    try {
      await axios.post("http://localhost:5000/api/holidays", {
        holidayPlanId: selectedPlan.holidayPlanId,
        holidayDate: holidayForm.holidayDate,
        description: holidayForm.description,
      });

      setHolidayModalOpen(false);
      setHolidayForm({ holidayDate: "", description: "" });
      setSelectedHoliday(null);

      fetchHolidays(selectedPlan.holidayPlanId).then(setHolidays);
    } catch (err) {
      console.error("Error saving holiday:", err);
    }
  };

  const handleDeleteHoliday = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/holidays/${id}`, {
        data: { updatedBy: user },
      });
      fetchHolidays(selectedPlan.holidayPlanId).then(setHolidays);
    } catch (err) {
      console.error("Error deleting holiday:", err);
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
            setPlanForm({ startYear: "", endYear: "", weeklyOff: [] });
            setPlanModalOpen(true);
          }}
        >
          <Plus size={18} /> Add Holiday Plan
        </button>
      </div>

      {/* Holiday Plans Table */}
      <div className="overflow-y-auto border border-gray-200 rounded-lg shadow-sm" style={{ maxHeight: "280px" }}>
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0">
            <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <th className="py-3 px-4">Plan</th>
              <th className="py-3 px-4">Start Date</th>
              <th className="py-3 px-4">End Date</th>
              <th className="py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {holidayPlans.map((plan) => (
              <tr key={plan.holidayPlanId} className="border-t hover:bg-gray-50">
                <td className="py-2 px-4">{plan.holidayPlanName}</td>
                <td className="py-2 px-4">{plan.startDate}</td>
                <td className="py-2 px-4">{plan.endDate}</td>
                <td className="py-2 px-4 flex gap-2">
                  <button
                    className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-md"
                    onClick={() => {
                      setPlanForm({
                        startYear: parseInt(plan.startDate.slice(0, 4)),
                        endYear: parseInt(plan.endDate.slice(0, 4)),
                        weeklyOff: plan.weeklyOff || [],
                      });
                      setSelectedPlan(plan);
                      setPlanModalOpen(true);
                    }}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-md"
                    onClick={() => handleDeletePlan(plan.holidayPlanId)}
                  >
                    <Trash size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {holidayPlans.length === 0 && (
              <tr>
                <td colSpan="4" className="text-center py-4 text-gray-500">
                  No holiday plans found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Holiday Selection */}
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
        >
          <option value="">-- Select --</option>
          {holidayPlans.map((plan) => (
            <option key={plan.holidayPlanId} value={plan.holidayPlanId}>
              {plan.holidayPlanName}
            </option>
          ))}
        </select>
      </div>

      {/* Holidays of Selected Plan */}
      {selectedPlan && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-semibold">Holidays in {selectedPlan.holidayPlanName}</h2>
            <button
              onClick={() => {
                setHolidayForm({ holidayDate: "", description: "" });
                setSelectedHoliday(null);
                setHolidayModalOpen(true);
              }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md"
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
                                  isPast
                                    ? "bg-gray-300 cursor-not-allowed"
                                    : "bg-blue-500 hover:bg-blue-600 text-white"
                                }`}
                                disabled={isPast}
                                onClick={() => {
                                  setHolidayForm({
                                    holidayDate: h.holidayDate,
                                    description: h.description,
                                  });
                                  setSelectedHoliday(h);
                                  setHolidayModalOpen(true);
                                }}
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                className={`p-2 rounded-md ${
                                  isPast
                                    ? "bg-gray-300 cursor-not-allowed"
                                    : "bg-red-500 hover:bg-red-600 text-white"
                                }`}
                                disabled={isPast}
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
                  {holidays.length === 0 && (
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
              placeholder="Start Year"
              value={planForm.startYear}
              onChange={(e) => setPlanForm({ ...planForm, startYear: e.target.value })}
              className="border border-gray-300 rounded-lg p-3 w-full mb-3 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <input
              type="number"
              placeholder="End Year"
              value={planForm.endYear}
              onChange={(e) => setPlanForm({ ...planForm, endYear: e.target.value })}
              className="border border-gray-300 rounded-lg p-3 w-full mb-3 focus:ring-2 focus:ring-blue-500 outline-none"
            />

            <div className="flex flex-wrap gap-4 mb-4">
              {weekDays.map((day) => (
                <label key={day} className="flex items-center gap-2 text-gray-700">
                  <input
                    type="checkbox"
                    checked={planForm.weeklyOff.includes(day)}
                    onChange={() => toggleWeeklyOff(day)}
                  />
                  {day}
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPlanModalOpen(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePlan}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow-md"
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
              onChange={(e) => setHolidayForm({ ...holidayForm, holidayDate: e.target.value })}
              className="border border-gray-300 rounded-lg p-3 w-full mb-3 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <input
              type="text"
              placeholder="Description"
              value={holidayForm.description}
              onChange={(e) => setHolidayForm({ ...holidayForm, description: e.target.value })}
              className="border border-gray-300 rounded-lg p-3 w-full mb-3 focus:ring-2 focus:ring-blue-500 outline-none"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setHolidayModalOpen(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveHoliday}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow-md"
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
