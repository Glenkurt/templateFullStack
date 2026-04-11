using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using Api.Data;
using Api.Models.DTOs;
using Api.Models.Entities;
using FluentAssertions;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Api.Tests.Integration;

public class CampaignEndpointTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public CampaignEndpointTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task CreateCampaign_WithAnotherUsersClient_ReturnsBadRequest()
    {
        var ownerEmail = $"campaign-owner-{Guid.NewGuid():N}@example.com";
        var ownerId = await EnsureUserAsync(ownerEmail, "Test@1234");
        var otherUserId = await EnsureUserAsync($"campaign-other-{Guid.NewGuid():N}@example.com", "Test@1234");

        Guid foreignClientId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var foreignClient = new Client
            {
                FirstName = "Other",
                LastName = "Client",
                Email = $"campaign-client-{Guid.NewGuid():N}@example.com",
                UserId = otherUserId
            };

            db.Clients.Add(foreignClient);
            await db.SaveChangesAsync();
            foreignClientId = foreignClient.Id;
        }

        var token = await GetAccessTokenAsync(ownerEmail, "Test@1234");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var request = new CreateCampaignRequest(
            Title: "Campagne test",
            Description: "Description",
            Amount: 150m,
            StartDate: DateOnly.FromDateTime(DateTime.UtcNow.Date),
            EndDate: DateOnly.FromDateTime(DateTime.UtcNow.Date.AddDays(5)),
            Status: CampaignStatus.Draft,
            ClientId: foreignClientId
        );

        var response = await _client.PostAsJsonAsync("/api/v1/campaigns", request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateCampaign_WithEndDateBeforeStartDate_ReturnsBadRequest()
    {
        var email = $"campaign-dates-{Guid.NewGuid():N}@example.com";
        var userId = await EnsureUserAsync(email, "Test@1234");
        var clientId = await CreateClientAsync(userId, $"campaign-dates-client-{Guid.NewGuid():N}@example.com");

        var token = await GetAccessTokenAsync(email, "Test@1234");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var request = new CreateCampaignRequest(
            Title: "Campagne invalide",
            Description: null,
            Amount: 99m,
            StartDate: new DateOnly(2026, 4, 20),
            EndDate: new DateOnly(2026, 4, 19),
            Status: CampaignStatus.Active,
            ClientId: clientId
        );

        var response = await _client.PostAsJsonAsync("/api/v1/campaigns", request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        problem.Should().NotBeNull();
        problem!.Detail.Should().Be("Campaign end date cannot be before start date.");
    }

    [Fact]
    public async Task CreateCampaign_WithInvalidStatusValue_ReturnsBadRequest()
    {
        var email = $"campaign-status-{Guid.NewGuid():N}@example.com";
        var userId = await EnsureUserAsync(email, "Test@1234");
        var clientId = await CreateClientAsync(userId, $"campaign-status-client-{Guid.NewGuid():N}@example.com");

        var token = await GetAccessTokenAsync(email, "Test@1234");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var payload = $$"""
        {
          "title": "Campagne statut",
          "description": null,
          "amount": 120,
          "startDate": "2026-04-20",
          "endDate": null,
          "status": 99,
          "clientId": "{{clientId}}"
        }
        """;

        using var content = new StringContent(payload, Encoding.UTF8, "application/json");
        var response = await _client.PostAsync("/api/v1/campaigns", content);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        problem.Should().NotBeNull();
        problem!.Detail.Should().Be("Campaign status is invalid.");
    }

    [Fact]
    public async Task CreateCampaign_ReturnsStatusAsStringInJson()
    {
        var email = $"campaign-json-{Guid.NewGuid():N}@example.com";
        var userId = await EnsureUserAsync(email, "Test@1234");
        var clientId = await CreateClientAsync(userId, $"campaign-json-client-{Guid.NewGuid():N}@example.com");

        var token = await GetAccessTokenAsync(email, "Test@1234");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var request = new CreateCampaignRequest(
            Title: "Campagne JSON",
            Description: null,
            Amount: 250m,
            StartDate: DateOnly.FromDateTime(DateTime.UtcNow.Date),
            EndDate: null,
            Status: CampaignStatus.Active,
            ClientId: clientId
        );

        var response = await _client.PostAsJsonAsync("/api/v1/campaigns", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var json = await response.Content.ReadAsStringAsync();
        json.Should().Contain("\"status\":\"Active\"");
    }

    private async Task<Guid> CreateClientAsync(Guid userId, string email)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var client = new Client
        {
            FirstName = "Test",
            LastName = "Client",
            Email = email,
            UserId = userId
        };

        db.Clients.Add(client);
        await db.SaveChangesAsync();

        return client.Id;
    }

    private async Task<Guid> EnsureUserAsync(string email, string password)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var existing = db.Users.FirstOrDefault(u => u.Email == email);
        if (existing is not null)
        {
            return existing.Id;
        }

        var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<ApplicationUser>>();
        var user = new ApplicationUser
        {
            Email = email,
            Role = "User"
        };
        user.PasswordHash = passwordHasher.HashPassword(user, password);

        db.Users.Add(user);
        await db.SaveChangesAsync();

        return user.Id;
    }

    private async Task<string> GetAccessTokenAsync(string email, string password)
    {
        await EnsureUserAsync(email, password);

        var loginResponse = await _client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new LoginRequestDto(email, password));

        loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var auth = await loginResponse.Content.ReadFromJsonAsync<AuthResponseDto>();
        auth.Should().NotBeNull();

        return auth!.AccessToken;
    }
}