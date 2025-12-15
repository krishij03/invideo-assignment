defmodule Backend.Repo.Migrations.CreateGeneratedImages do
  use Ecto.Migration

  def change do
    create table(:generated_images, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :kind, :string, null: false  # thumbnail | edit | composition | wasm_edit
      add :prompt, :text
      add :model, :string
      add :storage_bucket, :string
      add :storage_path, :string
      add :mime_type, :string
      add :width, :integer
      add :height, :integer
      add :metadata, :map, default: %{}

      timestamps(type: :utc_datetime)
    end

    create index(:generated_images, [:user_id])
    create index(:generated_images, [:kind])
    create index(:generated_images, [:inserted_at])
  end
end
