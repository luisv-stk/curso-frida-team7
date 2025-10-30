using System.Text.Json.Serialization;

namespace BackTeam7.Models;
public class Completion
{
    [JsonPropertyName("model")]
    public string? Model { get; set; }

    [JsonPropertyName("messages")]
    public List<completionMessage>? Messages { get; set; }

    [JsonPropertyName("temperature")]
    public double Temperature { get; set; }

    [JsonPropertyName("max_tokens")]
    public int MaxTokens { get; set; }

    [JsonPropertyName("top_p")]
    public double TopP { get; set; }

    [JsonPropertyName("stream")]
    public bool Stream { get; set; }

    [JsonPropertyName("tools")]
    public List<Tool>? Tools { get; set; }

    [JsonPropertyName("enable_caching")]
    public bool EnableCaching { get; set; }

    [JsonPropertyName("user_id")]
    public string? UserId { get; set; }

    [JsonPropertyName("email")]
    public string? Email { get; set; }
}

public class completionMessage
{
    [JsonPropertyName("role")]
    public string? Role { get; set; }

    [JsonPropertyName("content")]
    public string? Content { get; set; }
}

public class Tool
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("parameters")]
    public List<ToolParameter>? Parameters { get; set; }
}

public class ToolParameter
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    // mapped from JSON "type"
    [JsonPropertyName("type")]
    public string? Type { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("required")]
    public bool? Required { get; set; }
}