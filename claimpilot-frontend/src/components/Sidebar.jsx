import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Upload, FileText, Settings, HelpCircle, Mic } from 'lucide-react';

const links = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/upload', icon: Upload, label: 'New Claim' },
  { to: '/voice-document', icon: Mic, label: 'Voice to Text' },
];

const Sidebar = () => {
  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-100 min-h-[calc(100vh-64px)] p-6">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Navigation</p>
        <nav className="space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-[#0F3D3E] text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-[#0F3D3E]'
                }`
              }
            >
              <link.icon size={20} />
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="mt-auto space-y-1">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Support</p>
        <a href="#" className="flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
          <HelpCircle size={20} />
          <span>Help Center</span>
        </a>
        <a href="#" className="flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
          <Settings size={20} />
          <span>Settings</span>
        </a>
      </div>

      <div className="mt-6 p-4 bg-gradient-to-br from-[#0F3D3E] to-[#1a5c5e] rounded-2xl text-white">
        <p className="text-sm font-bold mb-1">ClaimPilot Pro</p>
        <p className="text-xs text-gray-300 mb-3">Unlock AI-powered auto-adjudication and batch processing.</p>
        <button className="w-full bg-[#D9C27A] text-[#0F3D3E] text-xs font-bold py-2 rounded-lg hover:brightness-110 transition">
          Upgrade Plan
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
