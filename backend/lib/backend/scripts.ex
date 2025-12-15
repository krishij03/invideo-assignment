defmodule Backend.Scripts do
  @moduledoc """
  The Scripts context for managing generated scripts.
  """

  import Ecto.Query, warn: false
  alias Backend.Repo
  alias Backend.Scripts.Script

  @doc """
  Returns all scripts for a user, ordered by newest first.
  """
  def list_scripts_for_user(user_id) do
    Script
    |> where([s], s.user_id == ^user_id)
    |> order_by([s], desc: s.inserted_at)
    |> Repo.all()
  end

  @doc """
  Gets a single script.
  """
  def get_script(id), do: Repo.get(Script, id)

  @doc """
  Gets a script for a specific user.
  """
  def get_script_for_user(id, user_id) do
    Script
    |> where([s], s.id == ^id and s.user_id == ^user_id)
    |> Repo.one()
  end

  @doc """
  Creates a script.
  """
  def create_script(attrs \\ %{}) do
    %Script{}
    |> Script.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Deletes a script.
  """
  def delete_script(%Script{} = script) do
    Repo.delete(script)
  end
end

