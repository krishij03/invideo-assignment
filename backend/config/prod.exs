import Config

# Force using SSL in production. This also sets the "strict-security-transport" header,
# known as HSTS. Railway handles SSL termination, so we use x_forwarded_proto to detect HTTPS.
# Note `:force_ssl` is required to be set at compile-time.
config :backend, BackendWeb.Endpoint,
  force_ssl: [
    rewrite_on: [:x_forwarded_proto],
    # Exclude health check endpoint from SSL redirect (for Railway health checks)
    exclude: ["invideo-assignment-production.up.railway.app/api/health"],
    host: nil
  ]

# Do not print debug messages in production
config :logger, level: :info

# Runtime production configuration, including reading
# of environment variables, is done on config/runtime.exs.
