import { Outlet } from 'react-router-dom'
import { Sidebar } from './sidebar'

export function AppShell() {
  return (
    <div className="flex min-h-screen bg-ground">
      <Sidebar />
      <main className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}
