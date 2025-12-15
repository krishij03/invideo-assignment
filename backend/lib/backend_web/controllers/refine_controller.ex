defmodule BackendWeb.RefineController do
  use BackendWeb, :controller

  alias Backend.Media
  alias Backend.Accounts

  @default_model "gemini-2.0-flash-exp"

  # Helper to get current user from conn
  defp current_user(conn), do: conn.assigns[:current_user]

  @doc """
  Create a new refinement session for multi-turn image editing.
  """
  def create_session(conn, params) do
    user = current_user(conn)

    model = Map.get(params, "model", @default_model)
    title = Map.get(params, "title")

    attrs = %{
      user_id: user.id,
      model: model,
      title: title
    }

    case Media.create_session(attrs) do
      {:ok, session} ->
        conn
        |> put_status(:created)
        |> json(%{
          data: %{
            id: session.id,
            model: session.model,
            title: session.title,
            created_at: session.inserted_at
          }
        })

      {:error, changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: %{message: "Validation failed", details: format_errors(changeset)}})
    end
  end

  @doc """
  List all refinement sessions for the current user.
  """
  def list_sessions(conn, _params) do
    user = current_user(conn)
    sessions = Media.list_sessions_for_user(user.id)

    json(conn, %{
      data:
        Enum.map(sessions, fn s ->
          %{
            id: s.id,
            model: s.model,
            title: s.title,
            created_at: s.inserted_at
          }
        end)
    })
  end

  @doc """
  Get a single refinement session.
  """
  def show_session(conn, %{"id" => id}) do
    user = current_user(conn)

    case Media.get_session_for_user(id, user.id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{error: %{message: "Session not found"}})

      session ->
        json(conn, %{
          data: %{
            id: session.id,
            model: session.model,
            title: session.title,
            created_at: session.inserted_at
          }
        })
    end
  end

  @doc """
  Send a message in a refinement session (multi-turn image generation).
  """
  def create_turn(conn, %{"id" => session_id} = params) do
    user = current_user(conn)

    case Media.get_session_for_user(session_id, user.id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{error: %{message: "Session not found"}})

      session ->
        message = Map.get(params, "message", "")
        images = Map.get(params, "images", [])

        if message == "" and images == [] do
          conn
          |> put_status(:bad_request)
          |> json(%{error: %{message: "message or images are required"}})
        else
          # Build user parts
          user_parts = build_user_parts(message, images)

          # Save user turn
          {:ok, _user_turn} =
            Media.create_turn(%{
              session_id: session.id,
              role: "user",
              parts_json: %{"parts" => user_parts}
            })

          # Build full contents from session history
          existing_contents = Media.build_gemini_contents(session.id)

          # Prepare request body
          body =
            %{
              "contents" => existing_contents
            }
            |> maybe_put_generation_config(params)

          # Call Gemini
          case Backend.Gemini.Client.generate_content(session.model, body) do
            {:ok, resp_body} ->
              # Extract model response parts
              model_parts = extract_model_parts(resp_body)

              # Save model turn
              {:ok, model_turn} =
                Media.create_turn(%{
                  session_id: session.id,
                  role: "model",
                  parts_json: %{"parts" => model_parts}
                })

              # Extract images for response
              images_out =
                resp_body
                |> Backend.Gemini.Response.extract_images()
                |> Enum.map(fn %{mime_type: mime_type, data: data} ->
                  %{"mimeType" => mime_type, "dataBase64" => data}
                end)

              texts = Backend.Gemini.Response.extract_texts(resp_body)

              # Increment image count if images were generated
              if images_out != [] do
                Accounts.increment_image_count(user.id)
              end

              # Get updated usage stats
              stats = Accounts.get_usage_stats(user.id)

              json(conn, %{
                data: %{
                  turn_id: model_turn.id,
                  texts: texts,
                  images: images_out,
                  model: session.model,
                  usage: stats
                }
              })

            {:error, err} ->
              conn
              |> put_status(:bad_gateway)
              |> json(%{error: %{message: "Gemini request failed", details: err}})
          end
        end
    end
  end

  @doc """
  List all turns in a refinement session.
  """
  def list_turns(conn, %{"id" => session_id}) do
    user = current_user(conn)

    case Media.get_session_for_user(session_id, user.id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{error: %{message: "Session not found"}})

      _session ->
        turns = Media.list_turns_for_session(session_id)

        json(conn, %{
          data:
            Enum.map(turns, fn t ->
              %{
                id: t.id,
                role: t.role,
                parts: t.parts_json["parts"] || [],
                created_at: t.inserted_at
              }
            end)
        })
    end
  end

  # =====================
  # Helpers
  # =====================

  defp build_user_parts(message, images) do
    text_part =
      if message != "" do
        [%{"text" => message}]
      else
        []
      end

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

    text_part ++ image_parts
  end

  defp extract_model_parts(resp_body) do
    with %{"candidates" => [candidate | _]} <- resp_body,
         %{"content" => %{"parts" => parts}} <- candidate,
         true <- is_list(parts) do
      parts
    else
      _ -> []
    end
  end

  defp maybe_put_generation_config(body, params) do
    response_modalities = Map.get(params, "responseModalities", ["TEXT", "IMAGE"])

    generation_config =
      %{"responseModalities" => response_modalities}
      |> maybe_put_image_config(params)

    Map.put(body, "generationConfig", generation_config)
  end

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
    if value == "", do: map, else: Map.put(map, key, value)
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
