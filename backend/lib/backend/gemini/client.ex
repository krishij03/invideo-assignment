defmodule Backend.Gemini.Client do
  @base_url "https://generativelanguage.googleapis.com/v1beta/models"

  @spec generate_content(String.t(), map()) :: {:ok, map()} | {:error, map()}
  def generate_content(model, body) when is_binary(model) and is_map(body) do
    require Logger
    Logger.info("Calling Gemini API with model: #{model}")
    api_key = Backend.Config.gemini_api_key!()
    url = "#{@base_url}/#{model}:generateContent"

    req_opts = [
      url: url,
      json: body,
      headers: [{"x-goog-api-key", api_key}, {"content-type", "application/json"}],
      receive_timeout: 300_000,
      connect_options: [timeout: 30_000]
    ]

    case Req.post(req_opts) do
      {:ok, %Req.Response{status: status, body: resp_body}} when status in 200..299 ->
        {:ok, resp_body}

      {:ok, %Req.Response{status: status, body: resp_body}} ->
        {:error, %{type: :gemini_http_error, status: status, body: resp_body}}

      {:error, exception} ->
        {:error, %{type: :req_error, error: Exception.message(exception)}}
    end
  end
end


