defmodule BackendWeb.AuthController do
  use BackendWeb, :controller

  alias Backend.Accounts

  @doc """
  Get current user info from JWT token.
  Returns user data and usage stats.
  """
  def me(conn, _params) do
    case conn.assigns[:current_user] do
      nil ->
        conn
        |> put_status(:unauthorized)
        |> json(%{error: %{message: "Not authenticated"}})

      user ->
        stats = Accounts.get_usage_stats(user.id)
        
        json(conn, %{
          data: %{
            user: %{
              id: user.id,
              email: user.email,
              username: user.username,
              is_admin: user.is_admin
            },
            usage: stats
          }
        })
    end
  end

  @doc """
  Get current usage stats for the authenticated user.
  """
  def usage(conn, _params) do
    case conn.assigns[:current_user] do
      nil ->
        conn
        |> put_status(:unauthorized)
        |> json(%{error: %{message: "Not authenticated"}})

      user ->
        stats = Accounts.get_usage_stats(user.id)
        json(conn, %{data: stats})
    end
  end

  @doc """
  Legacy login endpoint - kept for backwards compatibility.
  In production, use Supabase Auth directly from the frontend.
  """
  def login(conn, %{"username" => username, "password" => password}) do
    case Accounts.authenticate_user(username, password) do
      {:ok, user} ->
        stats = Accounts.get_usage_stats(user.id)
        
        json(conn, %{
          data: %{
            user: %{
              id: user.id,
              email: user.email,
              username: user.username,
              is_admin: user.is_admin
            },
            usage: stats,
            message: "Legacy login successful. Consider using Supabase Auth for production."
          }
        })

      {:error, :invalid_credentials} ->
        conn
        |> put_status(:unauthorized)
        |> json(%{error: %{message: "Invalid username or password"}})
    end
  end

  def login(conn, _params) do
    conn
    |> put_status(:bad_request)
    |> json(%{error: %{message: "username and password are required"}})
  end

  @doc """
  Health check that also verifies auth is configured.
  """
  def health(conn, _params) do
    jwt_secret_configured = System.get_env("SUPABASE_JWT_SECRET") != nil
    
    json(conn, %{
      data: %{
        auth_configured: jwt_secret_configured,
        message: if(jwt_secret_configured, do: "Auth ready", else: "SUPABASE_JWT_SECRET not configured")
      }
    })
  end
end
