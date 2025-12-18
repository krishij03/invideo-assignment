defmodule BackendWeb.ScriptController do
  use BackendWeb, :controller

  alias Backend.Scripts
  alias Backend.Accounts

  @default_model "claude-sonnet-4-20250514"

  # Helper to get current user from conn
  defp current_user(conn), do: conn.assigns[:current_user]

  # =====================
  # Generate (Anthropic API)
  # =====================

  def generate(conn, %{"prompt" => prompt} = params) when is_binary(prompt) do
    require Logger
    Logger.info("Received generate request. Prompt: #{inspect(prompt)}")

    prompt = String.trim(prompt)
    user = current_user(conn)

    if prompt == "" do
      conn
      |> put_status(:bad_request)
      |> json(%{error: %{message: "prompt is required"}})
    else
      model = Map.get(params, "model", @default_model)
      history = Map.get(params, "history", [])

      system_instruction = """
      You are a video script generator.

      Return ONLY valid JSON (no markdown, no code fences) matching this shape:
      [
        {
          "timestamp": "00:00",
          "visual_cue": "Short description for thumbnail/image generation",
          "audio_script": "Voiceover text for this segment",
          "duration": 5
        }
      ]

      Rules:
      - Always return an array (1+ items).
      - duration is an integer in seconds.
      - Keep timestamps increasing.
      - When asked to modify/edit an existing script, return the COMPLETE updated script with all sections (both existing and new/modified).
      - Recalculate timestamps to maintain proper sequence when adding new sections.
      """

      # Build conversation messages from history for Anthropic format
      history_messages = build_anthropic_messages(history)

      # Add the current user message
      current_message = %{"role" => "user", "content" => prompt}
      messages = history_messages ++ [current_message]

      case Backend.Anthropic.Client.generate_content(model, messages, system: system_instruction) do
        {:ok, resp_body} ->
          raw_text = Backend.Anthropic.Client.extract_text(resp_body)
          json_text = strip_code_fences(raw_text)

          case Jason.decode(json_text) do
            {:ok, script} ->
              # Increment usage count on successful generation
              Accounts.increment_script_count(user.id)

              # Get updated usage stats
              stats = Accounts.get_usage_stats(user.id)

              json(conn, %{data: %{model: model, script: script, usage: stats}})

            {:error, _} ->
              conn
              |> put_status(:unprocessable_entity)
              |> json(%{
                error: %{
                  message: "Model did not return valid JSON",
                  model: model,
                  raw: raw_text
                }
              })
          end

        {:error, %{type: :anthropic_http_error, status: 429, body: body} = _err} ->
          message = get_in(body, ["error", "message"]) || "Anthropic API rate limit exceeded"
          conn
          |> put_status(:too_many_requests)
          |> json(%{
            error: %{
              message: "Anthropic API rate limit exceeded. Please wait and try again.",
              details: message,
              model: model,
              code: "RATE_LIMIT_EXCEEDED"
            }
          })

        {:error, err} ->
          conn
          |> put_status(:bad_gateway)
          |> json(%{error: %{message: "Anthropic request failed", details: err}})
      end
    end
  end

  def generate(conn, _params) do
    conn
    |> put_status(:bad_request)
    |> json(%{error: %{message: "prompt is required"}})
  end

  # =====================
  # CRUD Operations
  # =====================

  @doc """
  List all scripts for the current user.
  """
  def index(conn, _params) do
    user = current_user(conn)
    scripts = Scripts.list_scripts_for_user(user.id)

    json(conn, %{
      data:
        Enum.map(scripts, fn s ->
          %{
            id: s.id,
            prompt: s.prompt,
            model: s.model,
            script: get_script_data(s.script_json),
            created_at: s.inserted_at
          }
        end)
    })
  end

  @doc """
  Get a single script.
  """
  def show(conn, %{"id" => id}) do
    user = current_user(conn)

    case Scripts.get_script_for_user(id, user.id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{error: %{message: "Script not found"}})

      script ->
        json(conn, %{
          data: %{
            id: script.id,
            prompt: script.prompt,
            model: script.model,
            script: get_script_data(script.script_json),
            created_at: script.inserted_at
          }
        })
    end
  end

  @doc """
  Save a script to the database.
  """
  def create(conn, %{"prompt" => prompt, "model" => model, "script" => script_json} = _params) do
    user = current_user(conn)

    # Wrap the list in a map to satisfy Ecto :map type
    wrapped_script_json = %{"data" => script_json}

    attrs = %{
      user_id: user.id,
      prompt: prompt,
      model: model,
      script_json: wrapped_script_json
    }

    case Scripts.create_script(attrs) do
      {:ok, script} ->
        conn
        |> put_status(:created)
        |> json(%{
          data: %{
            id: script.id,
            prompt: script.prompt,
            model: script.model,
            script: get_script_data(script.script_json),
            created_at: script.inserted_at
          }
        })

      {:error, changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: %{message: "Validation failed", details: format_errors(changeset)}})
    end
  end

  def create(conn, _params) do
    conn
    |> put_status(:bad_request)
    |> json(%{error: %{message: "prompt, model, and script are required"}})
  end

  @doc """
  Delete a script.
  """
  def delete(conn, %{"id" => id}) do
    user = current_user(conn)

    case Scripts.get_script_for_user(id, user.id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{error: %{message: "Script not found"}})

      script ->
        case Scripts.delete_script(script) do
          {:ok, _} ->
            json(conn, %{data: %{deleted: true}})

          {:error, _} ->
            conn
            |> put_status(:internal_server_error)
            |> json(%{error: %{message: "Failed to delete script"}})
        end
    end
  end

  # =====================
  # Helpers
  # =====================

  defp get_script_data(%{"data" => data}), do: data
  defp get_script_data(data), do: data


  defp strip_code_fences(text) when is_binary(text) do
    text
    |> String.trim()
    |> String.replace_prefix("```json", "")
    |> String.replace_prefix("```", "")
    |> String.replace_suffix("```", "")
    |> String.trim()
  end

  defp format_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Regex.replace(~r"%{(\w+)}", msg, fn _, key ->
        opts |> Keyword.get(String.to_existing_atom(key), key) |> to_string()
      end)
    end)
  end

  # Build Anthropic conversation messages from history
  # History format: [%{"role" => "user"|"model", "content" => "...", "script" => [...] | nil}]
  # Anthropic uses "assistant" instead of "model" for AI responses
  defp build_anthropic_messages(history) when is_list(history) do
    history
    |> Enum.map(fn turn ->
      role = Map.get(turn, "role", "user")
      content = Map.get(turn, "content", "")
      script = Map.get(turn, "script")

      # Convert "model" role to "assistant" for Anthropic API
      anthropic_role = if role == "model", do: "assistant", else: role

      # For assistant responses that include a script, include the script JSON
      text =
        if anthropic_role == "assistant" && script do
          content <> "\n\n" <> Jason.encode!(script)
        else
          content
        end

      %{"role" => anthropic_role, "content" => text}
    end)
  end

  defp build_anthropic_messages(_), do: []
end
