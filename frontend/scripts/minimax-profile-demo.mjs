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

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..', '..')
const rootEnv = parseEnvFile(path.join(repoRoot, '.env'))

const appUrl = 'http://127.0.0.1:3100'
const email = `minimax-ui-${Date.now()}@example.com`
const password = 'Test123456'
const profileName = `MiniMax Demo ${Date.now()}`

const provider = 'anthropic-compatible'
const baseUrl = rootEnv.LLM_BASE_URL
const modelName = rootEnv.LLM_MODEL
const apiKey = rootEnv.LLM_API_KEY

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

  const outputDir = path.join(repoRoot, 'output')
  fs.mkdirSync(outputDir, { recursive: true })
  const screenshotPath = path.join(outputDir, 'playwright-minimax-success.png')
  await page.screenshot({ path: screenshotPath, fullPage: true })

  console.log(JSON.stringify({
    ok: true,
    email,
    password,
    profileName,
    provider,
    baseUrl,
    modelName,
    screenshotPath,
  }, null, 2))
} finally {
  await browser.close()
}
