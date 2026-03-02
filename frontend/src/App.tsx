import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useThemeStore } from './stores/themeStore'
import { useAuthStore } from './stores/authStore'
import { Login } from './pages/Login'
import { NoteGenerator } from './pages/NoteGenerator'
import { NoteEditor } from './pages/NoteEditor'
import { Settings } from './pages/Settings'
import { AuthGuard } from './components/Auth/AuthGuard'
import { MainLayout } from './components/Layout/MainLayout'

function Home() {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold">欢迎使用 VideoNote</h2>
      <p className="text-gray-600 dark:text-gray-400 mt-2">选择左侧文件夹或创建新笔记开始</p>
    </div>
  )
}

function Notes() {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">我的笔记</h2>
      <p className="text-gray-600 dark:text-gray-400">暂无笔记，点击上方"新建"开始创建</p>
    </div>
  )
}

function Team() {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">团队空间</h2>
      <p className="text-gray-600 dark:text-gray-400">暂无团队，点击设置创建团队</p>
    </div>
  )
}

function App() {
  const { resolvedTheme } = useThemeStore()
  const { initialize, initialized } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark')
  }, [resolvedTheme])

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#191919]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-light"></div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={
          <AuthGuard>
            <MainLayout />
          </AuthGuard>
        }>
          <Route path="/" element={<Home />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/generate" element={<NoteGenerator />} />
          <Route path="/note/:id" element={<NoteEditor />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/team" element={<Team />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
