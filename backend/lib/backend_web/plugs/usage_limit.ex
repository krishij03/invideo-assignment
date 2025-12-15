defmodule BackendWeb.Plugs.CheckScriptLimit do
  @moduledoc """
  Plug to check if user has remaining script generations.
  Must be used after the Auth plug.
  """

  import Plug.Conn
  import Phoenix.Controller, only: [json: 2]

  alias Backend.Accounts
  alias Backend.Accounts.User

  @behaviour Plug

  def init(opts), do: opts

  def call(conn, _opts) do
    case conn.assigns[:current_user] do
      nil ->
        conn
        |> put_status(:unauthorized)
        |> json(%{error: %{message: "Authentication required", code: "AUTH_REQUIRED"}})
        |> halt()

      user ->
        if User.can_generate_script?(user) do
          conn
        else
          stats = Accounts.get_usage_stats(user.id)
          
          conn
          |> put_status(:payment_required)
          |> json(%{
            error: %{
              message: "Script generation limit reached. You have used all #{stats.scripts.limit} of your script generations.",
              code: "SCRIPT_LIMIT_EXCEEDED",
              usage: stats
            }
          })
          |> halt()
        end
    end
  end
end

defmodule BackendWeb.Plugs.CheckImageLimit do
  @moduledoc """
  Plug to check if user has remaining image generations.
  Must be used after the Auth plug.
  """

  import Plug.Conn
  import Phoenix.Controller, only: [json: 2]

  alias Backend.Accounts
  alias Backend.Accounts.User

  @behaviour Plug

  def init(opts), do: opts

  def call(conn, _opts) do
    case conn.assigns[:current_user] do
      nil ->
        conn
        |> put_status(:unauthorized)
        |> json(%{error: %{message: "Authentication required", code: "AUTH_REQUIRED"}})
        |> halt()

      user ->
        if User.can_generate_image?(user) do
          conn
        else
          stats = Accounts.get_usage_stats(user.id)
          
          conn
          |> put_status(:payment_required)
          |> json(%{
            error: %{
              message: "Image generation limit reached. You have used all #{stats.images.limit} of your image generations.",
              code: "IMAGE_LIMIT_EXCEEDED",
              usage: stats
            }
          })
          |> halt()
        end
    end
  end
end
