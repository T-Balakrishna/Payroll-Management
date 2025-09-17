const axios = require("axios");

async function fetchBiometrics() {
  try {
    const res = await axios.get("http://localhost:5000/api/punches/");
    console.log("✅ Punches fetched successfully:", res.data.length);
  } catch (err) {
    console.error("❌ Error fetching punches:", err.message);
  }
}

module.exports = fetchBiometrics;
