using BackTeam7.Models;
using Microsoft.AspNetCore.Mvc;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace processImageApp.controller
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProcessImageController : ControllerBase
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;        
        private const string FridaCompletionsUrl = "https://frida-llm-api.azurewebsites.net/v1/chat/completions";

        public ProcessImageController(
            IHttpClientFactory httpClientFactory, 
            IConfiguration configuration
            )
        {
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;            
        }

        // POST api/imagenprocess/complete-image        
        [HttpPost("complete-image")]
        public async Task<IActionResult> CompleteImage([FromBody] Image payload)
        {                                            
            if (payload == null)
            {
                return BadRequest("Request body is required.");
            }

            var client = _httpClientFactory.CreateClient();            
            
            var apiKey = _configuration["Frida:ApiKey"] ?? Environment.GetEnvironmentVariable("FRIDA_API_KEY");
            var request = new HttpRequestMessage(HttpMethod.Post, FridaCompletionsUrl);
            request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            if (!string.IsNullOrWhiteSpace(apiKey))
            {
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
            }

            var json = JsonSerializer.Serialize(payload, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
            });
                        
            
            request.Content = new StringContent(json, Encoding.UTF8, "application/json");

            try
            {
                using var response = await client.SendAsync(request);
                var body = await response.Content.ReadAsStringAsync();                

                if (!response.IsSuccessStatusCode)
                {                    
                    return StatusCode((int)response.StatusCode, body);
                }
                
                return Content(body, "application/json", Encoding.UTF8);
            }
            catch (HttpRequestException ex)
            {            
                return StatusCode(502, $"Upstream request failed: {ex.Message}");
            }
            catch (TaskCanceledException ex)
            {                
                return StatusCode(504, "Upstream request timed out.");
            }
        }
    }
}



