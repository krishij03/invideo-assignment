import Config

# Railway handles SSL termination at the edge, so we don't need force_ssl here.
# The x-forwarded-proto header is set by Railway's proxy.
# Disabling force_ssl to avoid issues with Railway's internal health checks.

# Do not print debug messages in production
config :logger, level: :info

# Runtime production configuration, including reading
# of environment variables, is done on config/runtime.exs.
