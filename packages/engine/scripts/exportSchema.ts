import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { exportContentJSONSchemas } from '../src/content/schema/toJSONSchema.js'

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'schema-export')

async function main(): Promise<void> {
  await mkdir(outDir, { recursive: true })
  const schemas = exportContentJSONSchemas()
  for (const [name, schema] of Object.entries(schemas)) {
    const file = path.join(outDir, `${name}.schema.json`)
    await writeFile(file, JSON.stringify(schema, null, 2) + '\n', 'utf8')
    console.log(`wrote ${path.relative(process.cwd(), file)}`)
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exitCode = 1
})
