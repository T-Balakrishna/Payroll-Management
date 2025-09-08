export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/userDashboard" element={<UserDashboard />} />
        <Route path="/adminDashboard" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}