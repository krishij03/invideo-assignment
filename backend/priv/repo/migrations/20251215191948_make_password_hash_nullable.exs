defmodule Backend.Repo.Migrations.MakePasswordHashNullable do
  use Ecto.Migration

  def change do
    alter table(:users) do
      modify :password_hash, :string, null: true, from: :string
    end
  end
end
