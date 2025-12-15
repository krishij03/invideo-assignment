# Script for populating the database. You can run it as:
#
#     mix run priv/repo/seeds.exs
#
# This creates:
# - Demo user (username: "demo", password: "demo123")
# - Admin user (username: "admin", password: "admin-invideo-assignment")

alias Backend.Accounts

IO.puts("=== Seeding Database ===\n")

# Create demo user
IO.puts("Creating demo user...")
case Accounts.get_or_create_demo_user() do
  {:ok, user} ->
    IO.puts("✓ Demo user ready: #{user.username} (ID: #{user.id})")

  {:error, changeset} ->
    IO.puts("✗ Failed to create demo user:")
    IO.inspect(changeset.errors)
end

# Create admin user
IO.puts("\nCreating admin user...")
case Accounts.get_or_create_admin_user() do
  {:ok, user} ->
    IO.puts("✓ Admin user ready: #{user.username} (ID: #{user.id})")
    IO.puts("  Email: admin@invideo-assignment.com")
    IO.puts("  Password: admin-invideo-assignment")
    IO.puts("  Is Admin: #{user.is_admin}")
    IO.puts("  Script Limit: #{user.script_generation_limit || "unlimited"}")
    IO.puts("  Image Limit: #{user.image_generation_limit || "unlimited"}")

  {:error, changeset} ->
    IO.puts("✗ Failed to create admin user:")
    IO.inspect(changeset.errors)
end

IO.puts("\n=== Seeding Complete ===")
