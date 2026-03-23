import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { Plus, RotateCcw, Trash2, Wifi } from 'lucide-react'
import { type ModelProfile, type ModelProfileDraft, type ProviderType } from '../../lib/modelProfiles'
import { useModelProfileStore } from '../../stores/modelProfileStore'

const providerOptions: Array<{
  value: ProviderType
  label: string
  defaultBaseUrl: string
}> = [
  { value: 'openai-compatible', label: 'OpenAI Compatible', defaultBaseUrl: 'https://api.openai.com/v1' },
  { value: 'anthropic-compatible', label: 'Anthropic Compatible', defaultBaseUrl: 'https://api.anthropic.com/v1' },
  { value: 'azure-openai', label: 'Azure OpenAI', defaultBaseUrl: 'https://your-resource.openai.azure.com' },
  { value: 'ollama', label: 'Ollama', defaultBaseUrl: 'http://localhost:11434/v1' },
  { value: 'groq-openai-compatible', label: 'Groq OpenAI Compatible', defaultBaseUrl: 'https://api.groq.com/openai/v1' },
]

const makeDraft = (): ModelProfileDraft => ({
  name: '',
  provider: 'openai-compatible',
  baseUrl: 'https://api.openai.com/v1',
  modelName: '',
  apiKey: '',
  isDefault: false,
  isActive: true,
})

const profileToDraft = (profile: ModelProfile): ModelProfileDraft => ({
  name: profile.name,
  provider: profile.provider,
  baseUrl: profile.baseUrl,
  modelName: profile.modelName,
  apiKey: '',
  isDefault: profile.isDefault,
  isActive: profile.isActive,
})

export function ModelProfileManager() {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<ModelProfileDraft>(makeDraft)

  const {
    profiles,
    loading,
    saving,
    error,
    lastTestResult,
    loadProfiles,
    createProfile,
    updateProfile,
    deleteProfile,
    setDefaultProfile,
    testDraft,
    testProfile,
  } = useModelProfileStore()

  useEffect(() => {
    void loadProfiles()
  }, [loadProfiles])

  const resetForm = () => {
    setEditingId(null)
    setDraft(makeDraft())
  }

  const startEdit = (profile: ModelProfile) => {
    setEditingId(profile.id)
    setDraft(profileToDraft(profile))
  }

  const handleProviderChange = (provider: ProviderType) => {
    const previousMeta = providerOptions.find((item) => item.value === draft.provider)
    const meta = providerOptions.find((item) => item.value === provider)
    setDraft((current) => ({
      ...current,
      provider,
      baseUrl:
        !current.baseUrl.trim() || current.baseUrl === previousMeta?.defaultBaseUrl
          ? meta?.defaultBaseUrl || ''
          : current.baseUrl,
    }))
  }

  const handleSave = async () => {
    if (editingId) {
      await updateProfile(editingId, draft)
    } else {
      await createProfile(draft)
    }
    resetForm()
  }

  const handleTest = async () => {
    if (editingId && !draft.apiKey.trim()) {
      await testProfile(editingId)
      return
    }
    await testDraft(draft)
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Model Profiles</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                API keys are stored only on the backend. The browser only receives masked hints.
              </p>
            </div>
            <button
              onClick={resetForm}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New
            </button>
          </div>

          {loading ? (
            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700">Loading...</div>
          ) : profiles.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
              No model profile yet. Create one to switch providers without editing `.env`.
            </div>
          ) : (
            <div className="space-y-3">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#202020]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium">{profile.name}</h4>
                        {profile.isDefault && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary-light/10 text-primary-light dark:bg-primary-dark/10 dark:text-primary-dark">
                            Default
                          </span>
                        )}
                        {!profile.isActive && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {profile.provider} / {profile.modelName}
                      </p>
                      <p className="text-xs text-gray-400 mt-1 break-all">{profile.baseUrl}</p>
                      <p className="text-xs text-gray-400 mt-1">Key: {profile.apiKeyHint}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => void testProfile(profile.id)}
                        className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="Test connection"
                      >
                        <Wifi className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => startEdit(profile)}
                        className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
                      >
                        Edit
                      </button>
                      {!profile.isDefault && (
                        <button
                          onClick={() => void setDefaultProfile(profile.id)}
                          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
                        >
                          Set default
                        </button>
                      )}
                      <button
                        onClick={() => void deleteProfile(profile.id)}
                        className="p-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 dark:border-red-900/30 dark:hover:bg-red-900/20"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="p-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#202020] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">{editingId ? 'Edit profile' : 'Create profile'}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Connection test failures do not block saving, but they are shown inline.
              </p>
            </div>
            <button
              onClick={resetForm}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              title="Reset form"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Name</label>
            <input
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              placeholder="OpenAI main account"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#191919] outline-none focus:ring-2 focus:ring-primary-light"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Provider</label>
            <select
              value={draft.provider}
              onChange={(event) => handleProviderChange(event.target.value as ProviderType)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#191919] outline-none focus:ring-2 focus:ring-primary-light"
            >
              {providerOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Base URL</label>
            <input
              value={draft.baseUrl}
              onChange={(event) => setDraft((current) => ({ ...current, baseUrl: event.target.value }))}
              placeholder={providerOptions.find((item) => item.value === draft.provider)?.defaultBaseUrl}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#191919] outline-none focus:ring-2 focus:ring-primary-light"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Model</label>
            <input
              value={draft.modelName}
              onChange={(event) => setDraft((current) => ({ ...current, modelName: event.target.value }))}
              placeholder="gpt-4o-mini / deepseek-chat / llama3.1"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#191919] outline-none focus:ring-2 focus:ring-primary-light"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              API Key {editingId ? <span className="text-xs text-gray-400">Leave blank to keep current key</span> : null}
            </label>
            <input
              type="password"
              value={draft.apiKey}
              onChange={(event) => setDraft((current) => ({ ...current, apiKey: event.target.value }))}
              placeholder={editingId ? 'Only fill this to replace the stored key' : 'Enter provider API key'}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#191919] outline-none focus:ring-2 focus:ring-primary-light"
            />
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={draft.isDefault}
              onChange={(event) => setDraft((current) => ({ ...current, isDefault: event.target.checked }))}
              className="w-4 h-4"
            />
            <span className="text-sm">Use as my default profile</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(event) => setDraft((current) => ({ ...current, isActive: event.target.checked }))}
              className="w-4 h-4"
            />
            <span className="text-sm">Profile is active</span>
          </label>

          {(error || lastTestResult) && (
            <div
              className={clsx(
                'p-3 rounded-lg text-sm',
                lastTestResult?.ok
                  ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                  : 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
              )}
            >
              {error || (
                lastTestResult?.ok
                  ? `Connection succeeded in ${lastTestResult.latencyMs} ms`
                  : `Connection failed: ${lastTestResult?.errorMessage || 'unknown error'}`
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => void handleTest()}
              disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-60"
            >
              <Wifi className="w-4 h-4" />
              Test connection
            </button>
            <button
              onClick={() => void handleSave()}
              disabled={saving || !draft.name.trim() || !draft.baseUrl.trim() || !draft.modelName.trim() || (!editingId && !draft.apiKey.trim())}
              className="flex-1 px-4 py-2.5 rounded-lg bg-primary-light dark:bg-primary-dark text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {editingId ? 'Save changes' : 'Create profile'}
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
