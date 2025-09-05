import React, { useState, useEffect } from "react";
import axios from "axios";

export default function HolidayManagement({ adminName }) {
  const [holidayPlans, setHolidayPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [holidays, setHolidays] = useState([]);
  const [newPlanName, setNewPlanName] = useState("");
  const [newPlanWeeklyOff, setNewPlanWeeklyOff] = useState("Sunday");
  const [newPlanStartDate, setNewPlanStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [newPlanEndDate, setNewPlanEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [newHoliday, setNewHoliday] = useState({ holidayDate: "", description: "" });
  const [editingHolidays, setEditingHolidays] = useState({});
  // Fetch all holiday plans
  const fetchHolidayPlans = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/holidayPlans");
      setHolidayPlans(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  

// Populate editingHolidays whenever holidays change
    useEffect(() => {
      const temp = {};
      holidays.forEach(h => {
        temp[h.holidayId] = { date: h.holidayDate, description: h.description };
      });
      setEditingHolidays(temp);
    }, [holidays]);


  // Fetch holidays of selected plan
  const fetchHolidays = async (holidayPlanId) => {
    try {
      if (!holidayPlanId) return setHolidays([]);
      const res = await axios.get(`http://localhost:5000/api/holidays/byPlan/${holidayPlanId}`);
      setHolidays(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchHolidayPlans();
  }, []);

  useEffect(() => {
    fetchHolidays(selectedPlanId);
  }, [selectedPlanId]);

  // Add new holiday plan
  const handleAddPlan = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:5000/api/holidayPlans", {
        holidayPlanName: newPlanName,
        weeklyOff: newPlanWeeklyOff,
        startDate: newPlanStartDate,
        endDate: newPlanEndDate,
        createdBy: adminName
      });

      // Automatically add weekly offs within start-end date
      const start = new Date(newPlanStartDate);
      const end = new Date(newPlanEndDate);
      const weeklyOffs = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dayName = d.toLocaleDateString("en-US", { weekday: "long" });
        if (dayName === newPlanWeeklyOff) {
          weeklyOffs.push({
            holidayPlanId: res.data.holidayPlanId,
            holidayDate: d.toISOString().split("T")[0],
            description: "Weekly Off",
            createdBy: adminName
          });
        }
      }
      if (weeklyOffs.length) {
        await axios.post("http://localhost:5000/api/holidays/bulk", weeklyOffs);
      }

      // Reset
      setNewPlanName("");
      setNewPlanWeeklyOff("Sunday");
      setNewPlanStartDate(new Date().toISOString().split("T")[0]);
      setNewPlanEndDate(new Date().toISOString().split("T")[0]);
      fetchHolidayPlans();
      alert("Holiday Plan added with weekly offs!");
    } catch (err) {
      console.error(err);
    }
  };

  // Add single holiday
  const handleAddHoliday = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/api/holidays", {
        ...newHoliday,
        holidayPlanId: selectedPlanId,
        createdBy: adminName
      });
      setNewHoliday({ holidayDate: "", description: "" });
      fetchHolidays(selectedPlanId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteHoliday = async (holidayId) => {
  try {
    if (window.confirm("Are you sure you want to delete this holiday?")) {
      await axios.delete(`http://localhost:5000/api/holidays/${holidayId}`);
      fetchHolidays(selectedPlanId);
    }
  } catch (err) {
    console.error(err);
  }
};


  // Update holiday (only if future)
  const handleUpdateHoliday = async (holidayId) => {
  try {
    const edited = editingHolidays[holidayId];
    if (!edited) return;

    const holiday = holidays.find(h => h.holidayId === holidayId);
    if (new Date(holiday.holidayDate) < new Date()) {
      alert("Cannot edit past holidays");
      return;
    }

    await axios.put(`http://localhost:5000/api/holidays/${holidayId}`, {
      description: edited.description,
      holidayDate: edited.date,
      updatedBy: adminName
    });

    // Clear local edits for this holiday
    setEditingHolidays(prev => {
      const copy = { ...prev };
      delete copy[holidayId];
      return copy;
    });

    fetchHolidays(selectedPlanId);
  } catch (err) {
    console.error(err);
  }
};



  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-md mt-10">
      <h1 className="text-2xl font-bold mb-4">Holiday Management</h1>

      {/* Add Holiday Plan */}
      <form onSubmit={handleAddPlan} className="space-y-2 mb-6">
        <h2 className="font-semibold">Add Holiday Plan</h2>
        <input
          type="text"
          placeholder="Plan Name"
          value={newPlanName}
          onChange={(e) => setNewPlanName(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
        <select
          value={newPlanWeeklyOff}
          onChange={(e) => setNewPlanWeeklyOff(e.target.value)}
          className="w-full p-2 border rounded"
        >
          {["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].map(day => (
            <option key={day} value={day}>{day}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            type="date"
            value={newPlanStartDate}
            onChange={(e) => setNewPlanStartDate(e.target.value)}
            className="w-1/2 p-2 border rounded"
            required
          />
          <input
            type="date"
            value={newPlanEndDate}
            onChange={(e) => setNewPlanEndDate(e.target.value)}
            className="w-1/2 p-2 border rounded"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Add Plan
        </button>
      </form>

      {/* Select Holiday Plan */}
      <div className="mb-6">
        <label className="font-semibold">Select Holiday Plan</label>
        <select
          value={selectedPlanId}
          onChange={(e) => setSelectedPlanId(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="">-- Select Plan --</option>
          {holidayPlans.map(plan => (
            <option key={plan.holidayPlanId} value={plan.holidayPlanId}>{plan.holidayPlanName}</option>
          ))}
        </select>
      </div>

      {/* Add Holiday */}
      {selectedPlanId && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();

            // Find selected plan to get start and end dates
            const plan = holidayPlans.find(p => {              
              return p.holidayPlanId === Number(selectedPlanId)});
            if (!plan) return alert("Holiday Plan not found");

            const holidayDateObj = new Date(newHoliday.holidayDate);
            const startDate = new Date(plan.startDate);
            const endDate = new Date(plan.endDate);

            if (holidayDateObj < startDate || holidayDateObj > endDate) {
              return alert(`Date must be between ${plan.startDate} and ${plan.endDate}`);
            }

            try {
              await axios.post("http://localhost:5000/api/holidays", {
                ...newHoliday,
                holidayPlanId: selectedPlanId,
                createdBy: adminName
              });
              setNewHoliday({ holidayDate: "", description: "" });
              fetchHolidays(selectedPlanId);
            } catch (err) {
              console.error(err);
            }
          }}
          className="space-y-2 mb-6"
        >
          <h2 className="font-semibold">Add Holiday</h2>
          <input
            type="date"
            value={newHoliday.holidayDate}
            onChange={(e) => setNewHoliday({ ...newHoliday, holidayDate: e.target.value })}
            className="w-full p-2 border rounded"
            required
          />
          <input
            type="text"
            placeholder="Description"
            value={newHoliday.description}
            onChange={(e) => setNewHoliday({ ...newHoliday, description: e.target.value })}
            className="w-full p-2 border rounded"
            required
          />
          <button
            type="submit"
            className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
          >
            Add Holiday
          </button>
        </form>
      )}


      {/* List Holidays */}
     {holidays.length > 0 && (
      <div className="overflow-x-auto">
        <h2 className="font-semibold mb-2">Holidays in Plan</h2>
        <table className="min-w-full border rounded">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 border">Date</th>
              <th className="px-4 py-2 border">Description</th>
              <th className="px-4 py-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {holidays.map(h => {
              const isPast = new Date(h.holidayDate) < new Date();
              const plan = holidayPlans.find(p => p.holidayPlanId === h.holidayPlanId);
              const startDate = plan?.startDate ? new Date(plan.startDate) : null;
              const endDate = plan?.endDate ? new Date(plan.endDate) : null;

              return (
                <tr key={h.holidayId} className="border-b">
                  {/* Date Input */}
                  <td className="px-4 py-2 border">
                    <input
                      type="date"
                      value={editingHolidays[h.holidayId]?.date || h.holidayDate}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        const newDateObj = new Date(newDate);

                        if ((startDate && newDateObj < startDate) || (endDate && newDateObj > endDate)) {
                          alert(`Date must be within ${plan.startDate} and ${plan.endDate}`);
                          setEditingHolidays(prev => ({
                            ...prev,
                            [h.holidayId]: { ...prev[h.holidayId], date: h.holidayDate }
                          }));
                          return;
                        }

                        setEditingHolidays(prev => ({
                          ...prev,
                          [h.holidayId]: { ...prev[h.holidayId], date: newDate }
                        }));
                      }}
                      className={`p-1 border rounded w-full ${isPast ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={isPast}
                    />
                  </td>

                  {/* Description Input */}
                  <td className="px-4 py-2 border">
                    <input
                      type="text"
                      value={editingHolidays[h.holidayId]?.description || h.description}
                      onChange={(e) =>
                        setEditingHolidays(prev => ({
                          ...prev,
                          [h.holidayId]: { ...prev[h.holidayId], description: e.target.value }
                        }))
                      }
                      className={`p-1 border rounded w-full ${isPast ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={isPast}
                    />
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-2 border flex gap-2">
                    <button
                      onClick={() => handleUpdateHoliday(h.holidayId)}
                      className={`bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 ${isPast ? 'opacity-50 cursor-not-allowed hover:bg-blue-500' : ''}`}
                      disabled={isPast}
                    >
                      Update
                    </button>
                    <button
                      onClick={() => handleDeleteHoliday(h.holidayId)}
                      className={`bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 ${isPast ? 'opacity-50 cursor-not-allowed hover:bg-red-500' : ''}`}
                      disabled={isPast}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}

    </div>
  );
}
