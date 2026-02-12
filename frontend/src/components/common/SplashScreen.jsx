import { useEffect } from "react";

export default function SplashScreen({ onFinish }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 3700); // Duration in ms (adjust if needed)

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-blue-600">
      <img
        src="https://nec.edu.in/wp-content/uploads/2024/01/NEC-LOGO1-unscreen.gif"
        alt="Loading..."
        className="w-48 h-auto"
      />
    </div>
  );
}
