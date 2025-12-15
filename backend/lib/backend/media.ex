defmodule Backend.Media do
  @moduledoc """
  The Media context for managing generated images and refinement sessions.
  """

  import Ecto.Query, warn: false
  alias Backend.Repo
  alias Backend.Media.{GeneratedImage, ImageRefinementSession, ImageRefinementTurn}

  # =====================
  # Generated Images
  # =====================

  @doc """
  Returns all generated images for a user, ordered by newest first.
  """
  def list_images_for_user(user_id, opts \\ []) do
    kind = Keyword.get(opts, :kind)

    query =
      GeneratedImage
      |> where([i], i.user_id == ^user_id)
      |> order_by([i], desc: i.inserted_at)

    query =
      if kind do
        where(query, [i], i.kind == ^kind)
      else
        query
      end

    Repo.all(query)
  end

  @doc """
  Gets a single generated image.
  """
  def get_image(id), do: Repo.get(GeneratedImage, id)

  @doc """
  Gets an image for a specific user.
  """
  def get_image_for_user(id, user_id) do
    GeneratedImage
    |> where([i], i.id == ^id and i.user_id == ^user_id)
    |> Repo.one()
  end

  @doc """
  Creates a generated image record.
  """
  def create_image(attrs \\ %{}) do
    %GeneratedImage{}
    |> GeneratedImage.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Deletes a generated image.
  """
  def delete_image(%GeneratedImage{} = image) do
    Repo.delete(image)
  end

  # =====================
  # Refinement Sessions
  # =====================

  @doc """
  Returns all refinement sessions for a user, ordered by newest first.
  """
  def list_sessions_for_user(user_id) do
    ImageRefinementSession
    |> where([s], s.user_id == ^user_id)
    |> order_by([s], desc: s.inserted_at)
    |> Repo.all()
  end

  @doc """
  Gets a session by ID.
  """
  def get_session(id), do: Repo.get(ImageRefinementSession, id)

  @doc """
  Gets a session for a specific user.
  """
  def get_session_for_user(id, user_id) do
    ImageRefinementSession
    |> where([s], s.id == ^id and s.user_id == ^user_id)
    |> Repo.one()
  end

  @doc """
  Gets a session with its turns preloaded.
  """
  def get_session_with_turns(id) do
    ImageRefinementSession
    |> where([s], s.id == ^id)
    |> preload(turns: ^from(t in ImageRefinementTurn, order_by: t.inserted_at))
    |> Repo.one()
  end

  @doc """
  Creates a refinement session.
  """
  def create_session(attrs \\ %{}) do
    %ImageRefinementSession{}
    |> ImageRefinementSession.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Creates a refinement turn.
  """
  def create_turn(attrs \\ %{}) do
    %ImageRefinementTurn{}
    |> ImageRefinementTurn.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Gets all turns for a session, ordered by creation time.
  """
  def list_turns_for_session(session_id) do
    ImageRefinementTurn
    |> where([t], t.session_id == ^session_id)
    |> order_by([t], asc: t.inserted_at)
    |> Repo.all()
  end

  @doc """
  Builds the Gemini contents array from session turns for multi-turn refinement.
  """
  def build_gemini_contents(session_id) do
    turns = list_turns_for_session(session_id)

    Enum.map(turns, fn turn ->
      %{
        "role" => turn.role,
        "parts" => turn.parts_json["parts"] || []
      }
    end)
  end
end

