defmodule Backend.Scripts.Script do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "scripts" do
    field :prompt, :string
    field :model, :string
    field :script_json, :map

    belongs_to :user, Backend.Accounts.User

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(script, attrs) do
    script
    |> cast(attrs, [:prompt, :model, :script_json, :user_id])
    |> validate_required([:prompt, :model, :script_json, :user_id])
    |> validate_length(:prompt, min: 1, max: 5000)
    |> foreign_key_constraint(:user_id)
  end
end

