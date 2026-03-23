import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

function parseEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const env = {}

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const separatorIndex = line.indexOf('=')
    if (separatorIndex === -1) continue

    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim()
    env[key] = value
  }

  return env
}

async function pollTask(taskId) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < 5 * 60 * 1000) {
    const response = await fetch(`http://127.0.0.1:8900/api/task/${taskId}`)
    const payload = await response.json()

    if (payload.status === 'success') {
      return payload
    }

    if (payload.status === 'failed') {
      throw new Error(`Task failed: ${payload.message || 'unknown error'}`)
    }

    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  throw new Error('Timed out waiting for task completion')
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..', '..')
const rootEnv = parseEnvFile(path.join(repoRoot, '.env'))

const appUrl = 'http://127.0.0.1:3100'
const email = `minimax-e2e-${Date.now()}@example.com`
const password = 'Test123456'
const profileName = `MiniMax E2E ${Date.now()}`
const provider = 'anthropic-compatible'
const baseUrl = rootEnv.LLM_BASE_URL
const modelName = rootEnv.LLM_MODEL
const apiKey = rootEnv.LLM_API_KEY
const sampleVideoUrl = 'https://samplelib.com/lib/preview/mp4/sample-5s.mp4'

if (!baseUrl || !modelName || !apiKey) {
  throw new Error('MiniMax values are missing in the root .env file')
}

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext()
const page = await context.newPage()

try {
  page.setDefaultTimeout(30000)

  await page.goto(`${appUrl}/login`, { waitUntil: 'networkidle' })

  await page.getByRole('button', { name: 'Create account' }).click()
  await page.getByPlaceholder('your@email.com').fill(email)
  await page.getByPlaceholder('At least 6 characters').fill(password)
  await page.getByRole('button', { name: 'Sign up' }).click()
  await page.waitForURL((url) => !url.pathname.endsWith('/login'))

  await page.goto(`${appUrl}/settings`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Models' }).click()

  const formSection = page.locator('section').filter({ hasText: 'Create profile' })
  await formSection.locator('input[placeholder="OpenAI main account"]').fill(profileName)
  await formSection.locator('select').selectOption(provider)

  const textInputs = formSection.locator('input:not([type="checkbox"]):not([type="password"])')
  await textInputs.nth(1).fill(baseUrl)
  await textInputs.nth(2).fill(modelName)
  await formSection.locator('input[type="password"]').fill(apiKey)

  const defaultCheckbox = formSection
    .getByText('Use as my default profile')
    .locator('..')
    .locator('input[type="checkbox"]')
  if (!(await defaultCheckbox.isChecked())) {
    await defaultCheckbox.check()
  }

  await formSection.getByRole('button', { name: 'Test connection' }).click()
  await page.getByText('Connection succeeded', { exact: false }).waitFor()

  await formSection.getByRole('button', { name: 'Create profile' }).click()
  await page.getByText(profileName).waitFor()

  await page.goto(`${appUrl}/generate`, { waitUntil: 'networkidle' })
  await page.locator('p').filter({ hasText: `Active model: ${profileName}` }).first().waitFor()
  await page.getByPlaceholder('Paste a YouTube, Bilibili, or other supported video URL...').fill(sampleVideoUrl)

  const generateResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith('/api/generate') && response.request().method() === 'POST'
  )

  await page.getByRole('button', { name: 'Start generation' }).click()

  const generateResponse = await generateResponsePromise
  const generatePayload = await generateResponse.json()
  const generateRequestBody = generateResponse.request().postDataJSON()

  if (!generateRequestBody.model_profile_id) {
    throw new Error('Frontend generate request did not include model_profile_id')
  }

  const taskResult = await pollTask(generatePayload.task_id)

  await page.waitForURL((url) => url.pathname.startsWith('/note/'), { timeout: 240000 })
  await page.getByDisplayValue(taskResult.result.title).waitFor({ timeout: 60000 })

  const outputDir = path.join(repoRoot, 'output')
  fs.mkdirSync(outputDir, { recursive: true })
  const screenshotPath = path.join(outputDir, 'playwright-minimax-e2e-success.png')
  await page.screenshot({ path: screenshotPath, fullPage: true })

  console.log(JSON.stringify({
    ok: true,
    email,
    password,
    profileName,
    provider,
    baseUrl,
    modelName,
    sampleVideoUrl,
    taskId: generatePayload.task_id,
    requestBody: generateRequestBody,
    title: taskResult.result.title,
    screenshotPath,
  }, null, 2))
} finally {
  await browser.close()
}
