using AutoMapper;
using BackTeam7.Models;

namespace BackTeam7;

public class MapperProfile : Profile
{
    public MapperProfile()
    {
        CreateMap<Image, Completion>()
            .ForMember(dest => dest.Model, opt => opt.MapFrom(src => src.Model))
            .ForMember(dest => dest.Stream, opt => opt.MapFrom(src => src.Stream))
            .ForMember(dest => dest.EnableCaching, opt => opt.MapFrom(src => src.EnableCaching))
            .ForMember(dest => dest.Messages, opt => opt.MapFrom(src => ConvertToCompletionMessages(src.Messages)))
            .ForMember(dest => dest.Temperature, opt => opt.Ignore())
            .ForMember(dest => dest.MaxTokens, opt => opt.Ignore())
            .ForMember(dest => dest.TopP, opt => opt.Ignore())
            .ForMember(dest => dest.Tools, opt => opt.Ignore())
            .ForMember(dest => dest.UserId, opt => opt.Ignore())
            .ForMember(dest => dest.Email, opt => opt.Ignore());
    }

    private static List<completionMessage>? ConvertToCompletionMessages(List<Message>? messages)
    {
        if (messages == null || messages.Count == 0)
            return null;

        var completionMessages = new List<completionMessage>();

        foreach (var message in messages)
        {
            if (message.Content == null || message.Content.Count == 0)
                continue;

            // Combinar todos los ContentItems en un solo string
            var contentBuilder = new System.Text.StringBuilder();

            foreach (var contentItem in message.Content)
            {
                if (contentItem.Type == "text" && !string.IsNullOrWhiteSpace(contentItem.Text))
                {
                    if (contentBuilder.Length > 0)
                        contentBuilder.Append(" ");
                    contentBuilder.Append(contentItem.Text);
                }
                else if (contentItem.Type == "image_url" && contentItem.ImageUrl?.Url != null)
                {
                    if (contentBuilder.Length > 0)
                        contentBuilder.Append(" ");
                    contentBuilder.Append($"[Image: {contentItem.ImageUrl.Url}]");
                }
            }

            var finalContent = contentBuilder.ToString();
            if (!string.IsNullOrWhiteSpace(finalContent))
            {
                completionMessages.Add(new completionMessage
                {
                    Role = message.Role,
                    Content = finalContent
                });
            }
        }

        return completionMessages.Count > 0 ? completionMessages : null;
    }
}
