import fs from 'fs'
import path from 'path'
import writeAuthConfig from '../../templates/lib/auth/config'
import writeAuthCredentials from '../../templates/lib/auth/credentials'
import writeAuthIndex from '../../templates/lib/auth/index'
import writeAuthRequireAuth from '../../templates/lib/auth/require-auth'
import writeAuthSession from '../../templates/lib/auth/session'
import writeAuthSessionToken from '../../templates/lib/auth/session-token'
import writeAuthLoginRoute from '../../templates/api/auth/login/route'
import writeAuthLogoutRoute from '../../templates/api/auth/logout/route'
import writeAuthSessionRoute from '../../templates/api/auth/session/route'

export function generateAuth(baseDir: string = process.cwd()): void {
  const authLibDir = path.join(baseDir, "lib", "auth")
  fs.mkdirSync(authLibDir, { recursive: true })

  const libFiles: Record<string, typeof writeAuthConfig> = {
    "config.ts": writeAuthConfig,
    "credentials.ts": writeAuthCredentials,
    "index.ts": writeAuthIndex,
    "require-auth.ts": writeAuthRequireAuth,
    "session.ts": writeAuthSession,
    "session-token.ts": writeAuthSessionToken,
  }
  for (const [fileName, code] of Object.entries(libFiles)) {
    fs.writeFileSync(path.join(authLibDir, fileName), code.toString())
  }

  const authApiDir = path.join(baseDir, "app", "api", "auth")
  const routeFiles: Record<string, typeof writeAuthLoginRoute> = {
    login: writeAuthLoginRoute,
    logout: writeAuthLogoutRoute,
    session: writeAuthSessionRoute,
  }
  for (const [routeName, code] of Object.entries(routeFiles)) {
    const routeDir = path.join(authApiDir, routeName)
    fs.mkdirSync(routeDir, { recursive: true })
    fs.writeFileSync(path.join(routeDir, "route.ts"), code.toString())
  }
}
