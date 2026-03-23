import { Shield } from 'lucide-react'

export function Team() {
  return (
    <div className="p-8">
      <div className="mx-auto max-w-3xl rounded-3xl border border-dashed border-gray-200 bg-white p-10 text-center dark:border-gray-700 dark:bg-[#202020]">
        <Shield className="mx-auto mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" />
        <h2 className="text-2xl font-bold">Team workspace is not enabled yet</h2>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          The codebase is now organized around a personal workflow first. Team scopes can be added later without mixing
          them into the core note flow.
        </p>
      </div>
    </div>
  )
}
