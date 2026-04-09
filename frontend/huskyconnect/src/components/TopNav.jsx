import { Link, useNavigate } from "react-router-dom";

export default function TopNav() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("huskyconnect_user_id");
    localStorage.removeItem("huskyconnect_name");
    navigate("/signin");
  };

  const linkClass =
    "text-sm font-medium text-slate-600 hover:text-purple-700 transition";

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <div className="font-semibold text-slate-900">
          Husky<span className="text-purple-700">Connect</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/home" className={linkClass}>
            Home
          </Link>
          <Link to="/students" className={linkClass}>
            Students
          </Link>
          <Link to="/profile" className={linkClass}>
            Profile
          </Link>
          <Link to="/recommendations" className={linkClass}>
            Recommendations
          </Link>
          <Link to="/messages" className={linkClass}>
            Messages
          </Link>
          <Link to="/chat" className={linkClass}>
            AI Assistant
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm font-semibold text-purple-700 hover:text-purple-600"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
