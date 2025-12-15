defmodule Backend.Accounts do
  @moduledoc """
  The Accounts context for user management.
  """

  import Ecto.Query, warn: false
  alias Backend.Repo
  alias Backend.Accounts.User

  # Admin credentials - in production, use environment variables
  @admin_username "admin"
  @admin_password "admin-invideo-assignment"
  @admin_email "admin@invideo-assignment.com"

  @doc """
  Returns the list of users.
  """
  def list_users do
    Repo.all(User)
  end

  @doc """
  Gets a single user by ID.
  """
  def get_user(id), do: Repo.get(User, id)

  @doc """
  Gets a user by username.
  """
  def get_user_by_username(username) do
    Repo.get_by(User, username: username)
  end

  @doc """
  Gets a user by email.
  """
  def get_user_by_email(email) do
    Repo.get_by(User, email: email)
  end

  @doc """
  Gets a user by Supabase ID.
  """
  def get_user_by_supabase_id(supabase_id) do
    Repo.get_by(User, supabase_id: supabase_id)
  end

  @doc """
  Creates a user.
  """
  def create_user(attrs \\ %{}) do
    %User{}
    |> User.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Creates or updates a user from Supabase Auth data.
  Returns the user if found by supabase_id, creates one otherwise.
  """
  def upsert_from_supabase(%{"sub" => supabase_id, "email" => email} = _claims) do
    case get_user_by_supabase_id(supabase_id) do
      nil ->
        # Check if this is the admin email
        is_admin = email == @admin_email
        
        # Generate username from email
        username = email |> String.split("@") |> List.first() |> ensure_unique_username()
        
        attrs = %{
          supabase_id: supabase_id,
          email: email,
          username: username,
          is_admin: is_admin,
          # Admins get unlimited usage
          script_generation_limit: if(is_admin, do: nil, else: 15),
          image_generation_limit: if(is_admin, do: nil, else: 10)
        }
        
        %User{}
        |> User.supabase_auth_changeset(attrs)
        |> Repo.insert()

      user ->
        {:ok, user}
    end
  end

  def upsert_from_supabase(_claims), do: {:error, :invalid_claims}

  defp ensure_unique_username(base_username) do
    if get_user_by_username(base_username) do
      "#{base_username}_#{:rand.uniform(9999)}"
    else
      base_username
    end
  end

  @doc """
  Authenticates a user by username and password.
  Returns {:ok, user} or {:error, :invalid_credentials}
  """
  def authenticate_user(username, password) do
    case get_user_by_username(username) do
      nil ->
        {:error, :invalid_credentials}

      user ->
        if User.verify_password(user, password) do
          {:ok, user}
        else
          {:error, :invalid_credentials}
        end
    end
  end

  @doc """
  Gets or creates a demo user.
  """
  def get_or_create_demo_user do
    case get_user_by_username("demo") do
      nil ->
        create_user(%{username: "demo", password: "demo123"})

      user ->
        {:ok, user}
    end
  end

  @doc """
  Gets or creates the admin user.
  """
  def get_or_create_admin_user do
    case get_user_by_username(@admin_username) do
      nil ->
        %User{}
        |> User.changeset(%{
          username: @admin_username,
          password: @admin_password,
          email: @admin_email,
          is_admin: true,
          script_generation_limit: nil,
          image_generation_limit: nil
        })
        |> Repo.insert()

      user ->
        {:ok, user}
    end
  end

  @doc """
  Increment script generation count for a user.
  Returns {:ok, user} or {:error, :limit_exceeded}
  """
  def increment_script_count(user_id) do
    user = get_user(user_id)
    
    if user && User.can_generate_script?(user) do
      user
      |> User.usage_changeset(%{script_generation_count: user.script_generation_count + 1})
      |> Repo.update()
    else
      {:error, :limit_exceeded}
    end
  end

  @doc """
  Increment image generation count for a user.
  Returns {:ok, user} or {:error, :limit_exceeded}
  """
  def increment_image_count(user_id) do
    user = get_user(user_id)
    
    if user && User.can_generate_image?(user) do
      user
      |> User.usage_changeset(%{image_generation_count: user.image_generation_count + 1})
      |> Repo.update()
    else
      {:error, :limit_exceeded}
    end
  end

  @doc """
  Check if user can generate script (without incrementing).
  """
  def can_generate_script?(user_id) do
    case get_user(user_id) do
      nil -> false
      user -> User.can_generate_script?(user)
    end
  end

  @doc """
  Check if user can generate image (without incrementing).
  """
  def can_generate_image?(user_id) do
    case get_user(user_id) do
      nil -> false
      user -> User.can_generate_image?(user)
    end
  end

  @doc """
  Get user's usage stats.
  """
  def get_usage_stats(user_id) do
    case get_user(user_id) do
      nil ->
        nil

      user ->
        %{
          scripts: %{
            used: user.script_generation_count,
            limit: user.script_generation_limit,
            remaining: User.remaining_scripts(user)
          },
          images: %{
            used: user.image_generation_count,
            limit: user.image_generation_limit,
            remaining: User.remaining_images(user)
          },
          is_admin: user.is_admin
        }
    end
  end
end
