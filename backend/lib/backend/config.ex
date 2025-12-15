defmodule Backend.Config do
  @spec gemini_api_key!() :: String.t()
  def gemini_api_key! do
    Application.get_env(:backend, :gemini_api_key) ||
      System.get_env("GEMINI_API_KEY") ||
      raise """
      GEMINI_API_KEY is missing.

      Set it in your environment (do not commit it), for example:

          export GEMINI_API_KEY="..."
      """
  end
end


