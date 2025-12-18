defmodule Backend.Anthropic.Client do
  @moduledoc """
  HTTP client for the Anthropic Claude API.
  Used for text generation tasks like script writing.
  """

  @base_url "https://api.anthropic.com/v1/messages"
  @api_version "2023-06-01"

  @spec generate_content(String.t(), list(map()), keyword()) :: {:ok, map()} | {:error, map()}
  def generate_content(model, messages, opts \\ []) when is_binary(model) and is_list(messages) do
    require Logger
    Logger.info("Calling Anthropic API with model: #{model}")

    api_key = Backend.Config.anthropic_api_key!()
    system = Keyword.get(opts, :system)
    max_tokens = Keyword.get(opts, :max_tokens, 4096)

    body =
      %{
        "model" => model,
        "max_tokens" => max_tokens,
        "messages" => messages
      }
      |> maybe_add_system(system)

    req_opts = [
      url: @base_url,
      json: body,
      headers: [
        {"x-api-key", api_key},
        {"anthropic-version", @api_version},
        {"content-type", "application/json"}
      ],
      receive_timeout: 300_000,
      connect_options: [timeout: 30_000]
    ]

    case Req.post(req_opts) do
      {:ok, %Req.Response{status: status, body: resp_body}} when status in 200..299 ->
        {:ok, resp_body}

      {:ok, %Req.Response{status: status, body: resp_body}} ->
        {:error, %{type: :anthropic_http_error, status: status, body: resp_body}}

      {:error, exception} ->
        {:error, %{type: :req_error, error: Exception.message(exception)}}
    end
  end

  @doc """
  Extracts text content from an Anthropic API response.
  """
  @spec extract_text(map()) :: String.t()
  def extract_text(response) when is_map(response) do
    response
    |> Map.get("content", [])
    |> Enum.filter(fn block -> Map.get(block, "type") == "text" end)
    |> Enum.map(fn block -> Map.get(block, "text", "") end)
    |> Enum.join("\n")
    |> String.trim()
  end

  defp maybe_add_system(body, nil), do: body
  defp maybe_add_system(body, ""), do: body
  defp maybe_add_system(body, system), do: Map.put(body, "system", system)
end
