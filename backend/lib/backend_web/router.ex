defmodule BackendWeb.Router do
  use BackendWeb, :router

  # Pipelines
  pipeline :api do
    plug :accepts, ["json"]
  end

  pipeline :authenticated do
    plug BackendWeb.Plugs.Auth
  end

  pipeline :check_script_limit do
    plug BackendWeb.Plugs.CheckScriptLimit
  end

  pipeline :check_image_limit do
    plug BackendWeb.Plugs.CheckImageLimit
  end

  # Public endpoints (no auth required)
  scope "/api", BackendWeb do
    pipe_through :api

    get "/health", HealthController, :index
    get "/auth/health", AuthController, :health
    
    # Legacy login (for backwards compatibility)
    post "/auth/login", AuthController, :login
  end

  # Authenticated endpoints
  scope "/api", BackendWeb do
    pipe_through [:api, :authenticated]

    # User info and usage
    get "/auth/me", AuthController, :me
    get "/auth/usage", AuthController, :usage

    # Scripts CRUD (reading doesn't need limit check)
    get "/scripts", ScriptController, :index
    get "/scripts/:id", ScriptController, :show
    post "/scripts", ScriptController, :create
    delete "/scripts/:id", ScriptController, :delete

    # Images CRUD (reading doesn't need limit check)
    get "/images", ImagesController, :index
    get "/images/:id", ImagesController, :show
    post "/images", ImagesController, :create
    delete "/images/:id", ImagesController, :delete

    # Refinement sessions (multi-turn image editing)
    post "/refine/sessions", RefineController, :create_session
    get "/refine/sessions", RefineController, :list_sessions
    get "/refine/sessions/:id", RefineController, :show_session
    get "/refine/sessions/:id/turns", RefineController, :list_turns
  end

  # Script generation (requires auth + script limit check)
  scope "/api", BackendWeb do
    pipe_through [:api, :authenticated, :check_script_limit]

    post "/script/generate", ScriptController, :generate
  end

  # Image generation (requires auth + image limit check)
  scope "/api", BackendWeb do
    pipe_through [:api, :authenticated, :check_image_limit]

    post "/images/generate", ImagesController, :generate
    post "/images/edit", ImagesController, :edit
    post "/images/compose", ImagesController, :compose
    post "/refine/sessions/:id/turns", RefineController, :create_turn
  end

  # Enable LiveDashboard in development
  if Application.compile_env(:backend, :dev_routes) do
    import Phoenix.LiveDashboard.Router

    scope "/dev" do
      pipe_through [:fetch_session, :protect_from_forgery]

      live_dashboard "/dashboard", metrics: BackendWeb.Telemetry
    end
  end
end
