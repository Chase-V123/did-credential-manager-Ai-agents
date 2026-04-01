import { NavLink, Outlet } from 'react-router-dom';

export function Layout() {
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition ${
      isActive
        ? 'bg-black text-white'
        : 'text-gray-700 hover:bg-gray-100'
    }`;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Kyndryl DID Agent Demo</h1>
            <p className="text-sm text-gray-500">Registry + AI Agent Discovery</p>
          </div>

          <nav className="flex gap-2">
            <NavLink to="/registry" className={navClass}>
              Registry
            </NavLink>
            <NavLink to="/discovery" className={navClass}>
              Discovery
            </NavLink>
            <NavLink to="/settings" className={navClass}>
              Settings
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}