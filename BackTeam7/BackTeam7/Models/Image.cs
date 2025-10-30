using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace BackTeam7.Models;
public class Image
{
    [JsonPropertyName("model")]
    public string? Model { get; set; }

    [JsonPropertyName("messages")]
    public List<Message>? Messages { get; set; }

    [JsonPropertyName("stream")]
    public bool Stream { get; set; }

    [JsonPropertyName("enable_caching")]
    public bool EnableCaching { get; set; }
}

public class Message
{
    [JsonPropertyName("role")]
    public string? Role { get; set; }

    [JsonPropertyName("content")]
    public List<ContentItem>? Content { get; set; }
}

public class ContentItem
{
    [JsonPropertyName("type")]
    public string? Type { get; set; }

    // present when type == "text"
    [JsonPropertyName("text")]
    public string? Text { get; set; }

    // present when type == "image_url"
    [JsonPropertyName("image_url")]
    public ImageUrl? ImageUrl { get; set; }
}

public class ImageUrl
{
    [JsonPropertyName("url")]
    public string? Url { get; set; }

    [JsonPropertyName("detail")]
    public string? Detail { get; set; }
}