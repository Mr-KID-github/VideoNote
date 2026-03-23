import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'

export function Login() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { signIn, signUp } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    if (isLogin) {
      const { error: signInError } = await signIn(email, password)

      if (signInError) {
        setError(signInError.message)
        setLoading(false)
        return
      }

      setLoading(false)
      navigate('/')
      return
    }

    const { error: signUpError, session } = await signUp(email, password)

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    setLoading(false)

    if (session) {
      navigate('/')
      return
    }

    setError('Account created. Sign in to continue.')
    setIsLogin(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#191919] p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">VideoNote</h1>
          <p className="text-gray-600 dark:text-gray-400">AI note assistant for video workflows.</p>
        </div>

        <div className="bg-white dark:bg-[#202020] rounded-2xl shadow-lg p-8">
          <h2 className="text-xl font-semibold mb-6">{isLogin ? 'Sign in' : 'Sign up'}</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#191919] focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark focus:border-transparent outline-none transition-all"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full pl-10 pr-12 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#191919] focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark focus:border-transparent outline-none transition-all"
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error ? <p className="text-red-500 text-sm">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-primary-light dark:bg-primary-dark text-white font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Working...' : isLogin ? 'Sign in' : 'Sign up'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
            <button
              onClick={() => {
                setIsLogin(!isLogin)
                setError('')
              }}
              className="ml-1 text-primary-light dark:text-primary-dark hover:underline"
            >
              {isLogin ? 'Create account' : 'Back to sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
