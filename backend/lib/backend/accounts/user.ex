defmodule Backend.Accounts.User do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  # Usage limits
  @default_script_limit 15
  @default_image_limit 10

  schema "users" do
    field :username, :string
    field :password_hash, :string
    # Virtual field for password input (not stored)
    field :password, :string, virtual: true
    
    # Supabase Auth fields
    field :supabase_id, :string
    field :email, :string
    
    # Admin flag
    field :is_admin, :boolean, default: false
    
    # Usage tracking
    field :script_generation_count, :integer, default: 0
    field :image_generation_count, :integer, default: 0
    
    # Limits (nil = unlimited for admins)
    field :script_generation_limit, :integer, default: @default_script_limit
    field :image_generation_limit, :integer, default: @default_image_limit

    has_many :scripts, Backend.Scripts.Script
    has_many :generated_images, Backend.Media.GeneratedImage
    has_many :image_refinement_sessions, Backend.Media.ImageRefinementSession

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(user, attrs) do
    user
    |> cast(attrs, [:username, :password, :email, :supabase_id, :is_admin, 
                    :script_generation_count, :image_generation_count,
                    :script_generation_limit, :image_generation_limit])
    |> validate_required([:username])
    |> validate_length(:username, min: 3, max: 50)
    |> validate_length(:password, min: 6, max: 100)
    |> validate_format(:email, ~r/^[^\s]+@[^\s]+$/, message: "must be a valid email")
    |> unique_constraint(:username)
    |> unique_constraint(:email)
    |> unique_constraint(:supabase_id)
    |> maybe_hash_password()
  end

  @doc """
  Changeset for creating a user from Supabase Auth.
  """
  def supabase_auth_changeset(user, attrs) do
    user
    |> cast(attrs, [:supabase_id, :email, :username, :is_admin,
                    :script_generation_limit, :image_generation_limit])
    |> validate_required([:supabase_id, :email])
    |> validate_format(:email, ~r/^[^\s]+@[^\s]+$/, message: "must be a valid email")
    |> unique_constraint(:supabase_id)
    |> unique_constraint(:email)
  end

  @doc """
  Changeset for updating usage counts.
  """
  def usage_changeset(user, attrs) do
    user
    |> cast(attrs, [:script_generation_count, :image_generation_count])
    |> validate_number(:script_generation_count, greater_than_or_equal_to: 0)
    |> validate_number(:image_generation_count, greater_than_or_equal_to: 0)
  end

  defp maybe_hash_password(%Ecto.Changeset{valid?: true, changes: %{password: password}} = changeset) 
       when is_binary(password) and password != "" do
    # Simple hash for demo purposes - in production use bcrypt/argon2
    hash = :crypto.hash(:sha256, password) |> Base.encode16(case: :lower)
    put_change(changeset, :password_hash, hash)
  end

  defp maybe_hash_password(changeset), do: changeset

  @doc """
  Verifies a password against the stored hash.
  """
  def verify_password(user, password) do
    hash = :crypto.hash(:sha256, password) |> Base.encode16(case: :lower)
    hash == user.password_hash
  end

  @doc """
  Checks if user can generate more scripts.
  """
  def can_generate_script?(%__MODULE__{is_admin: true}), do: true
  def can_generate_script?(%__MODULE__{script_generation_limit: nil}), do: true
  def can_generate_script?(%__MODULE__{script_generation_count: count, script_generation_limit: limit}) do
    count < limit
  end

  @doc """
  Checks if user can generate more images.
  """
  def can_generate_image?(%__MODULE__{is_admin: true}), do: true
  def can_generate_image?(%__MODULE__{image_generation_limit: nil}), do: true
  def can_generate_image?(%__MODULE__{image_generation_count: count, image_generation_limit: limit}) do
    count < limit
  end

  @doc """
  Returns remaining script generations.
  """
  def remaining_scripts(%__MODULE__{is_admin: true}), do: :unlimited
  def remaining_scripts(%__MODULE__{script_generation_limit: nil}), do: :unlimited
  def remaining_scripts(%__MODULE__{script_generation_count: count, script_generation_limit: limit}) do
    max(0, limit - count)
  end

  @doc """
  Returns remaining image generations.
  """
  def remaining_images(%__MODULE__{is_admin: true}), do: :unlimited
  def remaining_images(%__MODULE__{image_generation_limit: nil}), do: :unlimited
  def remaining_images(%__MODULE__{image_generation_count: count, image_generation_limit: limit}) do
    max(0, limit - count)
  end
end
