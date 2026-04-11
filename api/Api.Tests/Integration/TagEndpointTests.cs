using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Api.Data;
using Api.Models.DTOs;
using Api.Models.Entities;
using FluentAssertions;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Api.Tests.Integration;

public class TagEndpointTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public TagEndpointTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetTags_FiltersByUserAndCategory()
    {
        var ownerEmail = $"tag-owner-{Guid.NewGuid():N}@example.com";
        var ownerUserId = await EnsureUserAsync(ownerEmail, "Test@1234");
        var otherUserId = await EnsureUserAsync($"tag-other-{Guid.NewGuid():N}@example.com", "Test@1234");

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Tags.AddRange(
                new Tag { Name = "Prospection", Category = TagCategory.Revenue, UserId = ownerUserId },
                new Tag { Name = "Ads", Category = TagCategory.Expense, UserId = ownerUserId },
                new Tag { Name = "Other User", Category = TagCategory.Revenue, UserId = otherUserId }
            );
            await db.SaveChangesAsync();
        }

        var token = await GetAccessTokenAsync(ownerEmail, "Test@1234");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.GetAsync("/api/v1/tags?category=Revenue");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var tags = await response.Content.ReadFromJsonAsync<List<TagDto>>();
        tags.Should().NotBeNull();
        tags!.Should().ContainSingle(t => t.Name == "Prospection" && t.Category == TagCategory.Revenue);
        tags.Should().NotContain(t => t.Name == "Ads");
        tags.Should().NotContain(t => t.Name == "Other User");
    }

    [Fact]
    public async Task CreateTag_WithDuplicateNameInSameCategory_ReturnsConflict()
    {
        var email = $"tag-duplicate-{Guid.NewGuid():N}@example.com";
        var token = await GetAccessTokenAsync(email, "Test@1234");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var request = new CreateTagRequest("Inbound", TagCategory.Revenue);

        var firstResponse = await _client.PostAsJsonAsync("/api/v1/tags", request);
        firstResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        var duplicateResponse = await _client.PostAsJsonAsync(
            "/api/v1/tags",
            request with { Name = " inbound " });

        duplicateResponse.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task UpdateTag_WithWhitespaceName_ReturnsBadRequest()
    {
        var email = $"tag-invalid-{Guid.NewGuid():N}@example.com";
        var ownerUserId = await EnsureUserAsync(email, "Test@1234");

        Guid tagId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var tag = new Tag
            {
                Name = "Valid",
                Category = TagCategory.Expense,
                UserId = ownerUserId
            };

            db.Tags.Add(tag);
            await db.SaveChangesAsync();
            tagId = tag.Id;
        }

        var token = await GetAccessTokenAsync(email, "Test@1234");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.PatchAsJsonAsync(
            $"/api/v1/tags/{tagId}",
            new UpdateTagRequest("   ", null));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task DeleteTag_FromAnotherUser_ReturnsNotFound()
    {
        var ownerEmail = $"tag-delete-owner-{Guid.NewGuid():N}@example.com";
        var ownerUserId = await EnsureUserAsync(ownerEmail, "Test@1234");
        var otherEmail = $"tag-delete-other-{Guid.NewGuid():N}@example.com";
        await EnsureUserAsync(otherEmail, "Test@1234");

        Guid tagId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var tag = new Tag
            {
                Name = "Protected",
                Category = TagCategory.Revenue,
                UserId = ownerUserId
            };

            db.Tags.Add(tag);
            await db.SaveChangesAsync();
            tagId = tag.Id;
        }

        var otherToken = await GetAccessTokenAsync(otherEmail, "Test@1234");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", otherToken);

        var response = await _client.DeleteAsync($"/api/v1/tags/{tagId}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
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