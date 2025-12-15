defmodule BackendWeb.ImagesController do
  use BackendWeb, :controller

  alias Backend.Media
  alias Backend.Accounts

  # Image generation models (these support image output)
  @default_generate_model "gemini-2.5-flash-image"
  @default_compose_model "gemini-2.5-flash-image"

  # Helper to get current user from conn
  defp current_user(conn), do: conn.assigns[:current_user]

  # =====================
  # Generate (Gemini API)
  # =====================

  def generate(conn, %{"prompt" => prompt} = params) when is_binary(prompt) do
    prompt = String.trim(prompt)
    user = current_user(conn)

    if prompt == "" do
      conn
      |> put_status(:bad_request)
      |> json(%{error: %{message: "prompt is required"}})
    else
      model = Map.get(params, "model", @default_generate_model)

      body =
        %{
          "contents" => [
            %{
              "parts" => [
                %{"text" => prompt}
              ]
            }
          ]
        }
        |> maybe_put_generation_config(params)

      respond_with_images(conn, model, body, user)
    end
  end

  def generate(conn, _params) do
    conn
    |> put_status(:bad_request)
    |> json(%{error: %{message: "prompt is required"}})
  end

  def edit(conn, %{"prompt" => prompt, "imageBase64" => base64, "imageMimeType" => mime_type} = params)
      when is_binary(prompt) and is_binary(base64) and is_binary(mime_type) do
    prompt = String.trim(prompt)
    user = current_user(conn)

    if prompt == "" do
      conn
      |> put_status(:bad_request)
      |> json(%{error: %{message: "prompt is required"}})
    else
      model = Map.get(params, "model", @default_generate_model)

      body =
        %{
          "contents" => [
            %{
              "parts" => [
                %{
                  "inline_data" => %{
                    "mime_type" => mime_type,
                    "data" => base64
                  }
                },
                %{"text" => prompt}
              ]
            }
          ]
        }
        |> maybe_put_generation_config(params)

      respond_with_images(conn, model, body, user)
    end
  end

  def edit(conn, _params) do
    conn
    |> put_status(:bad_request)
    |> json(%{error: %{message: "prompt, imageBase64, and imageMimeType are required"}})
  end

  def compose(conn, %{"prompt" => prompt, "images" => images} = params)
      when is_binary(prompt) and is_list(images) do
    prompt = String.trim(prompt)
    user = current_user(conn)

    cond do
      prompt == "" ->
        conn
        |> put_status(:bad_request)
        |> json(%{error: %{message: "prompt is required"}})

      images == [] ->
        conn
        |> put_status(:bad_request)
        |> json(%{error: %{message: "images must be a non-empty array"}})

      true ->
        model = Map.get(params, "model", @default_compose_model)

        image_parts =
          Enum.flat_map(images, fn
            %{"base64" => data, "mimeType" => mime_type} when is_binary(data) and is_binary(mime_type) ->
              [
                %{
                  "inline_data" => %{
                    "mime_type" => mime_type,
                    "data" => data
                  }
                }
              ]

            _ ->
              []
          end)

        parts = [%{"text" => prompt} | image_parts]

        body =
          %{
            "contents" => [
              %{
                "parts" => parts
              }
            ]
          }
          |> maybe_put_generation_config(params)

        respond_with_images(conn, model, body, user)
    end
  end

  def compose(conn, _params) do
    conn
    |> put_status(:bad_request)
    |> json(%{error: %{message: "prompt and images are required"}})
  end

  # =====================
  # CRUD Operations
  # =====================

  @doc """
  List all saved images for the current user.
  """
  def index(conn, params) do
    user = current_user(conn)
    kind = Map.get(params, "kind")

    opts = if kind, do: [kind: kind], else: []
    images = Media.list_images_for_user(user.id, opts)

    json(conn, %{
      data:
        Enum.map(images, fn img ->
          %{
            id: img.id,
            kind: img.kind,
            prompt: img.prompt,
            model: img.model,
            storage_bucket: img.storage_bucket,
            storage_path: img.storage_path,
            mime_type: img.mime_type,
            width: img.width,
            height: img.height,
            metadata: img.metadata,
            created_at: img.inserted_at
          }
        end)
    })
  end

  @doc """
  Get a single saved image.
  """
  def show(conn, %{"id" => id}) do
    user = current_user(conn)

    case Media.get_image_for_user(id, user.id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{error: %{message: "Image not found"}})

      img ->
        json(conn, %{
          data: %{
            id: img.id,
            kind: img.kind,
            prompt: img.prompt,
            model: img.model,
            storage_bucket: img.storage_bucket,
            storage_path: img.storage_path,
            mime_type: img.mime_type,
            width: img.width,
            height: img.height,
            metadata: img.metadata,
            created_at: img.inserted_at
          }
        })
    end
  end

  @doc """
  Save an image record to the database (after uploading to Supabase Storage from frontend).
  """
  def create(conn, params) do
    user = current_user(conn)

    attrs = %{
      user_id: user.id,
      kind: Map.get(params, "kind", "thumbnail"),
      prompt: Map.get(params, "prompt"),
      model: Map.get(params, "model"),
      storage_bucket: Map.get(params, "storage_bucket"),
      storage_path: Map.get(params, "storage_path"),
      mime_type: Map.get(params, "mime_type"),
      width: Map.get(params, "width"),
      height: Map.get(params, "height"),
      metadata: Map.get(params, "metadata", %{})
    }

    case Media.create_image(attrs) do
      {:ok, img} ->
        conn
        |> put_status(:created)
        |> json(%{
          data: %{
            id: img.id,
            kind: img.kind,
            prompt: img.prompt,
            model: img.model,
            storage_bucket: img.storage_bucket,
            storage_path: img.storage_path,
            mime_type: img.mime_type,
            width: img.width,
            height: img.height,
            metadata: img.metadata,
            created_at: img.inserted_at
          }
        })

      {:error, changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: %{message: "Validation failed", details: format_errors(changeset)}})
    end
  end

  @doc """
  Delete a saved image record.
  """
  def delete(conn, %{"id" => id}) do
    user = current_user(conn)

    case Media.get_image_for_user(id, user.id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{error: %{message: "Image not found"}})

      img ->
        case Media.delete_image(img) do
          {:ok, _} ->
            json(conn, %{data: %{deleted: true}})

          {:error, _} ->
            conn
            |> put_status(:internal_server_error)
            |> json(%{error: %{message: "Failed to delete image"}})
        end
    end
  end

  # =====================
  # Helpers
  # =====================

  defp respond_with_images(conn, model, body, user) do
    case Backend.Gemini.Client.generate_content(model, body) do
      {:ok, resp_body} ->
        texts = Backend.Gemini.Response.extract_texts(resp_body)

        images =
          resp_body
          |> Backend.Gemini.Response.extract_images()
          |> Enum.map(fn %{mime_type: mime_type, data: data} ->
            %{"mimeType" => mime_type, "dataBase64" => data}
          end)

        if images == [] do
          conn
          |> put_status(:unprocessable_entity)
          |> json(%{
            error: %{
              message: "Model response did not include any images",
              model: model,
              texts: texts
            }
          })
        else
          # Increment usage count on successful generation
          Accounts.increment_image_count(user.id)
          
          # Get updated usage stats
          stats = Accounts.get_usage_stats(user.id)
          
          json(conn, %{data: %{"model" => model, "texts" => texts, "images" => images, "usage" => stats}})
        end

      {:error, %{type: :gemini_http_error, status: 429, body: body} = _err} ->
        # Quota exceeded - provide helpful error message
        message = get_in(body, ["error", "message"]) || "Gemini API quota exceeded"
        conn
        |> put_status(:too_many_requests)
        |> json(%{
          error: %{
            message: "Gemini API quota exceeded. Please wait and try again, or upgrade your plan at https://aistudio.google.com",
            details: message,
            model: model,
            code: "QUOTA_EXCEEDED"
          }
        })

      {:error, %{type: :gemini_http_error, status: status, body: body} = _err} ->
        # Other Gemini API errors
        message = get_in(body, ["error", "message"]) || "Gemini API error"
        conn
        |> put_status(:bad_gateway)
        |> json(%{
          error: %{
            message: "Gemini API error: #{message}",
            details: body,
            model: model,
            status: status
          }
        })

      {:error, err} ->
        conn
        |> put_status(:bad_gateway)
        |> json(%{error: %{message: "Gemini request failed", details: err, model: model}})
    end
  end

  defp maybe_put_generation_config(body, params) do
    response_modalities = Map.get(params, "responseModalities", ["TEXT", "IMAGE"])

    generation_config =
      %{}
      |> maybe_put_image_config(params)
      |> maybe_put_response_modalities(response_modalities)

    if generation_config == %{} do
      body
    else
      Map.put(body, "generationConfig", generation_config)
    end
  end

  defp maybe_put_response_modalities(config, modalities) when is_list(modalities) do
    Map.put(config, "responseModalities", modalities)
  end

  defp maybe_put_response_modalities(config, _modalities), do: config

  defp maybe_put_image_config(config, params) do
    aspect_ratio = Map.get(params, "aspectRatio")
    image_size = Map.get(params, "imageSize")

    image_config =
      %{}
      |> maybe_put_if_present("aspectRatio", aspect_ratio)
      |> maybe_put_if_present("imageSize", image_size)

    if image_config == %{} do
      config
    else
      Map.put(config, "imageConfig", image_config)
    end
  end

  defp maybe_put_if_present(map, _key, nil), do: map

  defp maybe_put_if_present(map, key, value) when is_binary(value) do
    value = String.trim(value)

    if value == "" do
      map
    else
      Map.put(map, key, value)
    end
  end

  defp maybe_put_if_present(map, _key, _value), do: map

  defp format_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Regex.replace(~r"%{(\w+)}", msg, fn _, key ->
        opts |> Keyword.get(String.to_existing_atom(key), key) |> to_string()
      end)
    end)
  end
end
