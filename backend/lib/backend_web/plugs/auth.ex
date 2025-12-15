defmodule BackendWeb.Plugs.Auth do
  @moduledoc """
  Plug for authenticating requests using Supabase JWT tokens.
  
  Extracts the JWT from the Authorization header, verifies it,
  and assigns the current user to the connection.
  """

  import Plug.Conn
  import Phoenix.Controller, only: [json: 2]

  alias Backend.Accounts

  @behaviour Plug

  def init(opts), do: opts

  def call(conn, _opts) do
    with {:ok, token} <- extract_token(conn),
         {:ok, claims} <- verify_token(token),
         {:ok, user} <- get_or_create_user(claims) do
      conn
      |> assign(:current_user, user)
      |> assign(:jwt_claims, claims)
    else
      {:error, :no_token} ->
        conn
        |> put_status(:unauthorized)
        |> json(%{error: %{message: "Authentication required", code: "AUTH_REQUIRED"}})
        |> halt()

      {:error, :invalid_token} ->
        conn
        |> put_status(:unauthorized)
        |> json(%{error: %{message: "Invalid or expired token", code: "INVALID_TOKEN"}})
        |> halt()

      {:error, :user_creation_failed} ->
        conn
        |> put_status(:internal_server_error)
        |> json(%{error: %{message: "Failed to create user account", code: "USER_CREATION_FAILED"}})
        |> halt()

      {:error, reason} ->
        conn
        |> put_status(:unauthorized)
        |> json(%{error: %{message: "Authentication failed: #{inspect(reason)}", code: "AUTH_FAILED"}})
        |> halt()
    end
  end

  @doc """
  Extract Bearer token from Authorization header.
  """
  def extract_token(conn) do
    case get_req_header(conn, "authorization") do
      ["Bearer " <> token] -> {:ok, String.trim(token)}
      ["bearer " <> token] -> {:ok, String.trim(token)}
      _ -> {:error, :no_token}
    end
  end

  @doc """
  Verify Supabase JWT token.
  
  Supabase JWTs are signed with the JWT secret from the project settings.
  The token contains claims like sub (user id), email, role, etc.
  """
  def verify_token(token) do
    jwt_secret = get_jwt_secret()
    
    # Supabase uses HS256 algorithm
    signer = Joken.Signer.create("HS256", jwt_secret)
    
    case Joken.verify(token, signer) do
      {:ok, claims} ->
        # Verify token hasn't expired
        now = System.system_time(:second)
        exp = Map.get(claims, "exp", 0)
        
        if exp > now do
          {:ok, claims}
        else
          {:error, :token_expired}
        end

      {:error, _reason} ->
        {:error, :invalid_token}
    end
  end

  @doc """
  Get or create user from JWT claims.
  """
  def get_or_create_user(claims) do
    case Accounts.upsert_from_supabase(claims) do
      {:ok, user} -> {:ok, user}
      {:error, _} -> {:error, :user_creation_failed}
    end
  end

  defp get_jwt_secret do
    # Supabase JWT secret - get from environment
    System.get_env("SUPABASE_JWT_SECRET") ||
      Application.get_env(:backend, :supabase_jwt_secret) ||
      raise "SUPABASE_JWT_SECRET environment variable is not set"
  end
end

defmodule BackendWeb.Plugs.OptionalAuth do
  @moduledoc """
  Optional authentication plug - doesn't halt if no token present.
  Useful for endpoints that work both authenticated and unauthenticated.
  """

  import Plug.Conn

  alias Backend.Accounts
  alias BackendWeb.Plugs.Auth

  @behaviour Plug

  def init(opts), do: opts

  def call(conn, _opts) do
    case Auth.extract_token(conn) do
      {:ok, token} ->
        case Auth.verify_token(token) do
          {:ok, claims} ->
            case Auth.get_or_create_user(claims) do
              {:ok, user} ->
                conn
                |> assign(:current_user, user)
                |> assign(:jwt_claims, claims)

              _ ->
                conn
            end

          _ ->
            conn
        end

      _ ->
        conn
    end
  end
end

defmodule BackendWeb.Plugs.RequireAdmin do
  @moduledoc """
  Plug that requires the current user to be an admin.
  Must be used after the Auth plug.
  """

  import Plug.Conn
  import Phoenix.Controller, only: [json: 2]

  @behaviour Plug

  def init(opts), do: opts

  def call(conn, _opts) do
    case conn.assigns[:current_user] do
      %{is_admin: true} ->
        conn

      _ ->
        conn
        |> put_status(:forbidden)
        |> json(%{error: %{message: "Admin access required", code: "ADMIN_REQUIRED"}})
        |> halt()
    end
  end
end
