import { z } from 'zod'
import { listFacadeFields } from '../../domain/facade/FacadeField.js'

// TODO.md #1: the enum whitelist is generated from listFacadeFields(), never
// hand-duplicated. flag.*/counter.* are open namespaces, so they're
// validated by prefix pattern instead of an enum.

const STATIC_FACADE_PATHS = listFacadeFields().map((f) => f.path)

const staticPathSchema = z.enum(STATIC_FACADE_PATHS as [string, ...string[]])
const dynamicPathSchema = z.string().regex(/^(flag|counter)\.[a-zA-Z0-9_]+$/)

export const facadePathSchema = z.union([staticPathSchema, dynamicPathSchema])
