defmodule Backend.Repo.Migrations.AddAuthAndUsageTracking do
  use Ecto.Migration

  def change do
    alter table(:users) do
      # Supabase Auth integration
      add :supabase_id, :string
      add :email, :string
      
      # Role and permissions
      add :is_admin, :boolean, default: false, null: false
      
      # Usage tracking
      add :script_generation_count, :integer, default: 0, null: false
      add :image_generation_count, :integer, default: 0, null: false
      
      # Limits (null = unlimited for admins)
      add :script_generation_limit, :integer, default: 15
      add :image_generation_limit, :integer, default: 10
    end

    # Index for Supabase auth lookup
    create unique_index(:users, [:supabase_id], where: "supabase_id IS NOT NULL")
    create unique_index(:users, [:email], where: "email IS NOT NULL")
  end
end
