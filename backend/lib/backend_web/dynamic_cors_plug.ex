defmodule BackendWeb.DynamicCORSPlug do
  @behaviour Plug

  def init(opts), do: opts

  def call(conn, opts) do
    # Read config at runtime from the Application environment (set by runtime.exs)
    origins = Application.get_env(:backend, :cors_origins) || ["http://localhost:5173"]

    # Merge dynamic origin with static optionspassed from endpoint.ex
    cors_opts = Keyword.put(opts, :origin, origins)

    # Invoke CORSPlug
    # We call init() here to ensure options are normalized as CORSPlug expects
    CORSPlug.call(conn, CORSPlug.init(cors_opts))
  end
end
