import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export function MainLayout() {
  return (
    <div className="h-screen overflow-hidden flex flex-col">
      <Header />
      <div className="min-h-0 flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-white dark:bg-[#191919]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
