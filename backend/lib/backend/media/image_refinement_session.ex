defmodule Backend.Media.ImageRefinementSession do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "image_refinement_sessions" do
    field :model, :string
    field :title, :string

    belongs_to :user, Backend.Accounts.User
    has_many :turns, Backend.Media.ImageRefinementTurn, foreign_key: :session_id

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(session, attrs) do
    session
    |> cast(attrs, [:model, :title, :user_id])
    |> validate_required([:model, :user_id])
    |> foreign_key_constraint(:user_id)
  end
end

