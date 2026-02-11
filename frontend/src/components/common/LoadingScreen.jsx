export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      <img
        src="https://nec.edu.in/wp-content/uploads/2024/01/NEC-LOGO1-unscreen.gif"
        alt="Loading..."
        className="w-40 h-auto"
      />
    </div>
  );
}