defmodule Backend.Repo.Migrations.CreateImageRefinementTurns do
  use Ecto.Migration

  def change do
    create table(:image_refinement_turns, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :session_id, references(:image_refinement_sessions, type: :binary_id, on_delete: :delete_all), null: false
      add :role, :string, null: false  # user | model
      add :parts_json, :map, null: false

      timestamps(type: :utc_datetime)
    end

    create index(:image_refinement_turns, [:session_id])
    create index(:image_refinement_turns, [:inserted_at])
  end
end
