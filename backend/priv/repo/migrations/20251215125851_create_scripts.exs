defmodule Backend.Repo.Migrations.CreateScripts do
  use Ecto.Migration

  def change do
    create table(:scripts, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :prompt, :text, null: false
      add :model, :string, null: false
      add :script_json, :map, null: false

      timestamps(type: :utc_datetime)
    end

    create index(:scripts, [:user_id])
    create index(:scripts, [:inserted_at])
  end
end
