defmodule BackendWeb.DynamicCORSPlug do
  @behaviour Plug

  def init(opts), do: opts

  def call(conn, opts) do
    # Read config at runtime from the Application environment (set by runtime.exs)
    configured_origins = Application.get_env(:backend, :cors_origins) || ["http://localhost:5173"]

    # Handle wildcard "*" - CORSPlug expects a function or specific format for wildcards
    # If origins contains "*", allow all origins
    origins =
      cond do
        # Single wildcard string
        configured_origins == "*" ->
          "*"

        # List containing wildcard
        is_list(configured_origins) and "*" in configured_origins ->
          "*"

        # List containing just "*" as the only element
        configured_origins == ["*"] ->
          "*"

        # Normal list of origins
        true ->
          configured_origins
      end

    # Merge dynamic origin with static options passed from endpoint.ex
    cors_opts = Keyword.put(opts, :origin, origins)

    # Invoke CORSPlug
    # We call init() here to ensure options are normalized as CORSPlug expects
    CORSPlug.call(conn, CORSPlug.init(cors_opts))
  end
end
