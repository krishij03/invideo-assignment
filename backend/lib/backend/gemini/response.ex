defmodule Backend.Gemini.Response do
  @spec extract_texts(map()) :: [String.t()]
  def extract_texts(body) when is_map(body) do
    body
    |> parts()
    |> Enum.flat_map(fn
      %{"text" => text} when is_binary(text) -> [text]
      _ -> []
    end)
  end

  @spec extract_images(map()) :: [%{mime_type: String.t(), data: String.t()}]
  def extract_images(body) when is_map(body) do
    body
    |> parts()
    |> Enum.flat_map(fn part ->
      case part do
        %{"inlineData" => %{"data" => data, "mimeType" => mime_type}}
        when is_binary(data) and is_binary(mime_type) ->
          [%{mime_type: mime_type, data: data}]

        %{"inline_data" => %{"data" => data, "mime_type" => mime_type}}
        when is_binary(data) and is_binary(mime_type) ->
          [%{mime_type: mime_type, data: data}]

        _ ->
          []
      end
    end)
  end

  defp parts(body) do
    with %{"candidates" => [candidate | _]} <- body,
         %{"content" => %{"parts" => parts}} <- candidate,
         true <- is_list(parts) do
      parts
    else
      _ -> []
    end
  end
end


