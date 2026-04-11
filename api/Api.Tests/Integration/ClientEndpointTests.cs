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

public class ClientEndpointTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public ClientEndpointTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task CreateClient_WithValidData_ReturnsCreated()
    {
        var email = $"client-test-{Guid.NewGuid():N}@example.com";
        var token = await GetAccessTokenAsync(email, "Test@1234");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var request = new CreateClientRequest(
            FirstName: "John",
            LastName: "Doe",
            Email: $"john-{Guid.NewGuid():N}@example.com",
            Phone: "+33612345678",
            CompanyName: "Acme"
        );

        var response = await _client.PostAsJsonAsync("/api/v1/clients", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var result = await response.Content.ReadFromJsonAsync<ClientDto>();
        result.Should().NotBeNull();
        result!.FirstName.Should().Be("John");
        result.LastName.Should().Be("Doe");
        result.CompanyName.Should().Be("Acme");
    }

    [Fact]
    public async Task GetClients_ReturnsOnlyAuthenticatedUsersClients()
    {
        var ownerEmail = $"owner-{Guid.NewGuid():N}@example.com";
        var ownerUserId = await EnsureUserAsync(ownerEmail, "Test@1234");
        var otherUserId = await EnsureUserAsync($"other-{Guid.NewGuid():N}@example.com", "Test@1234");

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Clients.Add(new Client
            {
                FirstName = "Owner",
                LastName = "Client",
                Email = $"owner-client-{Guid.NewGuid():N}@example.com",
                UserId = ownerUserId
            });
            db.Clients.Add(new Client
            {
                FirstName = "Other",
                LastName = "Client",
                Email = $"other-client-{Guid.NewGuid():N}@example.com",
                UserId = otherUserId
            });
            await db.SaveChangesAsync();
        }

        var token = await GetAccessTokenAsync(ownerEmail, "Test@1234");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.GetAsync("/api/v1/clients");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var clients = await response.Content.ReadFromJsonAsync<List<ClientDto>>();
        clients.Should().NotBeNull();
        clients!.Should().ContainSingle(c => c.FirstName == "Owner" && c.LastName == "Client");
        clients.Should().NotContain(c => c.FirstName == "Other" && c.LastName == "Client");
    }

    [Fact]
    public async Task CreateClient_WithDuplicateEmail_ReturnsConflict()
    {
        var email = $"client-duplicate-{Guid.NewGuid():N}@example.com";
        var token = await GetAccessTokenAsync(email, "Test@1234");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var request = new CreateClientRequest(
            FirstName: "John",
            LastName: "Doe",
            Email: $"duplicate-{Guid.NewGuid():N}@example.com",
            Phone: null,
            CompanyName: null
        );

        var firstResponse = await _client.PostAsJsonAsync("/api/v1/clients", request);
        firstResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        var duplicateResponse = await _client.PostAsJsonAsync(
            "/api/v1/clients",
            request with { Email = request.Email.ToUpperInvariant() });

        duplicateResponse.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task UpdateAndDeleteClient_RespectUserIsolationAndCrudFlow()
    {
        var email = $"client-flow-{Guid.NewGuid():N}@example.com";
        var ownerUserId = await EnsureUserAsync(email, "Test@1234");
        var otherUserEmail = $"other-flow-{Guid.NewGuid():N}@example.com";
        await EnsureUserAsync(otherUserEmail, "Test@1234");

        Guid clientId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var client = new Client
            {
                FirstName = "Before",
                LastName = "Update",
                Email = $"flow-client-{Guid.NewGuid():N}@example.com",
                UserId = ownerUserId
            };

            db.Clients.Add(client);
            await db.SaveChangesAsync();
            clientId = client.Id;
        }

        var ownerToken = await GetAccessTokenAsync(email, "Test@1234");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ownerToken);

        var updateResponse = await _client.PatchAsJsonAsync(
            $"/api/v1/clients/{clientId}",
            new UpdateClientRequest(
                FirstName: "After",
                LastName: null,
                Email: null,
                Phone: " ",
                CompanyName: " Prospect 2000 "
            ));

        updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await updateResponse.Content.ReadFromJsonAsync<ClientDto>();
        updated.Should().NotBeNull();
        updated!.FirstName.Should().Be("After");
        updated.Phone.Should().BeNull();
        updated.CompanyName.Should().Be("Prospect 2000");

        var otherToken = await GetAccessTokenAsync(otherUserEmail, "Test@1234");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", otherToken);

        var forbiddenDelete = await _client.DeleteAsync($"/api/v1/clients/{clientId}");
        forbiddenDelete.StatusCode.Should().Be(HttpStatusCode.NotFound);

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ownerToken);

        var deleteResponse = await _client.DeleteAsync($"/api/v1/clients/{clientId}");
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var getDeletedResponse = await _client.GetAsync($"/api/v1/clients/{clientId}");
        getDeletedResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task UpdateClient_WithWhitespaceFirstName_ReturnsBadRequest()
    {
        var email = $"client-invalid-{Guid.NewGuid():N}@example.com";
        var ownerUserId = await EnsureUserAsync(email, "Test@1234");

        Guid clientId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var client = new Client
            {
                FirstName = "Valid",
                LastName = "Client",
                Email = $"invalid-client-{Guid.NewGuid():N}@example.com",
                UserId = ownerUserId
            };

            db.Clients.Add(client);
            await db.SaveChangesAsync();
            clientId = client.Id;
        }

        var token = await GetAccessTokenAsync(email, "Test@1234");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.PatchAsJsonAsync(
            $"/api/v1/clients/{clientId}",
            new UpdateClientRequest(
                FirstName: "   ",
                LastName: null,
                Email: null,
                Phone: null,
                CompanyName: null
            ));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
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