defmodule Backend.Media.ImageRefinementTurn do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @roles ~w(user model)

  schema "image_refinement_turns" do
    field :role, :string
    field :parts_json, :map

    belongs_to :session, Backend.Media.ImageRefinementSession

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(turn, attrs) do
    turn
    |> cast(attrs, [:role, :parts_json, :session_id])
    |> validate_required([:role, :parts_json, :session_id])
    |> validate_inclusion(:role, @roles)
    |> foreign_key_constraint(:session_id)
  end

  def roles, do: @roles
end

