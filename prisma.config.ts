import path from 'node:path'
import { defineConfig } from 'prisma/config'

// Honor DATABASE_URL when set (e.g. by E2E tooling), otherwise fall back to the
// local dev DB file.
const datasourceUrl =
  process.env.DATABASE_URL ?? `file:${path.join(process.cwd(), 'data', 'taskflow.db')}`

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    url: datasourceUrl,
  },
})
