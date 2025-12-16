defmodule Backend.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application
  require Logger

  @impl true
  def start(_type, _args) do
    Logger.info("Starting Backend Application...")
    Logger.info("PORT: #{System.get_env("PORT", "4000")}")
    Logger.info("PHX_HOST: #{System.get_env("PHX_HOST", "not set")}")
    Logger.info("DATABASE_URL set: #{System.get_env("DATABASE_URL") != nil}")
    Logger.info("CORS_ORIGINS: #{System.get_env("CORS_ORIGINS", "not set")}")

    children = [
      BackendWeb.Telemetry,
      Backend.Repo,
      {DNSCluster, query: Application.get_env(:backend, :dns_cluster_query) || :ignore},
      {Phoenix.PubSub, name: Backend.PubSub},
      # Start a worker by calling: Backend.Worker.start_link(arg)
      # {Backend.Worker, arg},
      # Start to serve requests, typically the last entry
      BackendWeb.Endpoint
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: Backend.Supervisor]
    
    Logger.info("Starting supervisor with #{length(children)} children...")
    result = Supervisor.start_link(children, opts)
    Logger.info("Supervisor started: #{inspect(result)}")
    result
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    BackendWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
