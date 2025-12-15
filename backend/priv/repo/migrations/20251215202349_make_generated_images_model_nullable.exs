defmodule Backend.Repo.Migrations.MakeGeneratedImagesModelNullable do
  use Ecto.Migration

  def change do
    alter table(:generated_images) do
      modify :model, :string, null: true
    end
  end
end
