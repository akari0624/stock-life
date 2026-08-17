/**
 * `pnpm --filter @stock-life/tokens build`
 */
import path from 'node:path'
import { buildTokens, OUTPUT_FILES } from './index.ts'
import { TokenValidationError } from './validate.ts'

const root = path.resolve(import.meta.dirname, '..')

try {
  await buildTokens({ srcDir: path.join(root, 'src'), outDir: path.join(root, 'dist') })
  console.log(`[tokens] built ${OUTPUT_FILES.join(', ')} → dist/`)
} catch (error) {
  if (error instanceof TokenValidationError) {
    console.error(`[tokens] ${error.message}`)
    process.exit(1)
  }
  throw error
}
