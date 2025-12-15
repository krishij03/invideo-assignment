defmodule Backend.Media.GeneratedImage do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @kinds ~w(thumbnail edit composition wasm_edit)

  schema "generated_images" do
    field :kind, :string
    field :prompt, :string
    field :model, :string
    field :storage_bucket, :string
    field :storage_path, :string
    field :mime_type, :string
    field :width, :integer
    field :height, :integer
    field :metadata, :map, default: %{}

    belongs_to :user, Backend.Accounts.User

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(image, attrs) do
    image
    |> cast(attrs, [
      :kind,
      :prompt,
      :model,
      :storage_bucket,
      :storage_path,
      :mime_type,
      :width,
      :height,
      :metadata,
      :user_id
    ])
    |> validate_required([:kind, :user_id])
    |> validate_inclusion(:kind, @kinds)
    |> foreign_key_constraint(:user_id)
  end

  def kinds, do: @kinds
end

