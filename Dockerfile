# Grid-Commander, as something you can deploy.
#
# Three stages, so the thing that runs carries no build toolchain, no source, and
# no secrets. The runtime image holds a traced dependency set, the compiled
# server, the migration journal, and two scripts.
#
#   docker build -t grid-commander .
#   docker run --rm -e DATABASE_URL=... grid-commander migrate   # release step
#   docker run -p 3000:3000 --env-file .env grid-commander       # serve
#
# Serving runs the schema gate first and refuses to start against a database
# missing any migration this build carries. See tools/check-schema.mjs.

# ---------------------------------------------------------------- dependencies
FROM node:22-alpine AS deps
WORKDIR /app

# Only the manifest, so this layer is cached until the dependencies change and
# not on every source edit.
COPY package.json package-lock.json ./
RUN npm ci

# --------------------------------------------------------------------- build
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Deliberately carries no environment. The build needs no configuration, and a
# build argument holding a placeholder credential is how a real one ends up in a
# layer. `next build` is proven to work without any — see .github/workflows.
#
# `prebuild` regenerates the theme from openspec/design/system.json, so the
# design tokens in the image are the ones in the repository rather than whatever
# was last generated on someone's laptop.
RUN npm run build

# --------------------------------------------------------------------- runtime
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
# The standalone server reads both. 0.0.0.0 rather than localhost, or the
# container serves only itself.
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Runs as nobody in particular. The image holds no secret and needs to write
# nothing, so there is no reason for it to be root.
RUN addgroup -g 1001 -S nodejs && adduser -S -u 1001 -G nodejs commander

# The traced server: `output: 'standalone'` in next.config.ts resolves the
# dependencies actually reachable from the application and copies only those.
COPY --from=builder --chown=commander:nodejs /app/.next/standalone ./
COPY --from=builder --chown=commander:nodejs /app/.next/static ./.next/static

# The journal, and the two operations that read it. `drizzle-orm` is bundled
# into the server chunks rather than traced, so the migrator needs its own copy —
# it has no runtime dependencies of its own, which is what makes this one
# directory rather than a second install.
COPY --from=builder --chown=commander:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=commander:nodejs /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --chown=commander:nodejs tools/check-schema.mjs tools/migrate.mjs ./tools/
COPY --chown=commander:nodejs docker-entrypoint.sh ./

USER commander
EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["serve"]
