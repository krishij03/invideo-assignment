defmodule BackendWeb.HealthController do
  use BackendWeb, :controller

  def index(conn, _params) do
    json(conn, %{ok: true})
  end
end


