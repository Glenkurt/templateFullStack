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

public class DashboardEndpointTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public DashboardEndpointTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetSummary_ReturnsOnlyCurrentUserAggregates()
    {
        var ownerEmail = $"dashboard-owner-{Guid.NewGuid():N}@example.com";
        var ownerId = await EnsureUserAsync(ownerEmail, "Test@1234");
        var otherId = await EnsureUserAsync($"dashboard-other-{Guid.NewGuid():N}@example.com", "Test@1234");

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var ownerClient = new Client
            {
                FirstName = "Owner",
                LastName = "Client",
                Email = $"owner-summary-{Guid.NewGuid():N}@example.com",
                UserId = ownerId
            };

            var otherClient = new Client
            {
                FirstName = "Other",
                LastName = "Client",
                Email = $"other-summary-{Guid.NewGuid():N}@example.com",
                UserId = otherId
            };

            db.Clients.AddRange(ownerClient, otherClient);

            db.Revenues.AddRange(
                new Revenue { UserId = ownerId, Amount = 100m, Date = DateOnly.FromDateTime(DateTime.UtcNow.Date), Client = ownerClient },
                new Revenue { UserId = ownerId, Amount = 50m, Date = DateOnly.FromDateTime(DateTime.UtcNow.Date) },
                new Revenue { UserId = otherId, Amount = 999m, Date = DateOnly.FromDateTime(DateTime.UtcNow.Date), Client = otherClient }
            );

            db.Expenses.AddRange(
                new Expense { UserId = ownerId, Name = "Ads", Amount = 30m, Date = DateOnly.FromDateTime(DateTime.UtcNow.Date) },
                new Expense { UserId = otherId, Name = "Other", Amount = 500m, Date = DateOnly.FromDateTime(DateTime.UtcNow.Date) }
            );

            db.Campaigns.AddRange(
                new Campaign
                {
                    UserId = ownerId,
                    Client = ownerClient,
                    Title = "Spring Campaign",
                    Amount = 150m,
                    StartDate = DateOnly.FromDateTime(DateTime.UtcNow.Date),
                    Status = CampaignStatus.Active
                },
                new Campaign
                {
                    UserId = otherId,
                    Client = otherClient,
                    Title = "Other Campaign",
                    Amount = 200m,
                    StartDate = DateOnly.FromDateTime(DateTime.UtcNow.Date),
                    Status = CampaignStatus.Active
                }
            );

            await db.SaveChangesAsync();
        }

        var token = await GetAccessTokenAsync(ownerEmail, "Test@1234");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.GetAsync("/api/v1/dashboard/summary");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var summary = await response.Content.ReadFromJsonAsync<DashboardSummaryDto>();
        summary.Should().NotBeNull();
        summary!.TotalRevenue.Should().Be(150m);
        summary.TotalExpense.Should().Be(30m);
        summary.NetProfit.Should().Be(120m);
        summary.TotalClients.Should().Be(1);
        summary.ActiveCampaigns.Should().Be(1);
    }

    [Fact]
    public async Task GetOverview_WithNoData_ReturnsEmptyCollectionsAndZeroedSummary()
    {
        var email = $"dashboard-empty-{Guid.NewGuid():N}@example.com";
        var token = await GetAccessTokenAsync(email, "Test@1234");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.GetAsync("/api/v1/dashboard/overview");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var overview = await response.Content.ReadFromJsonAsync<DashboardOverviewDto>();

        overview.Should().NotBeNull();
        overview!.Summary.TotalRevenue.Should().Be(0m);
        overview.Summary.TotalExpense.Should().Be(0m);
        overview.Summary.NetProfit.Should().Be(0m);
        overview.Summary.TotalClients.Should().Be(0);
        overview.Summary.ActiveCampaigns.Should().Be(0);
        overview.MonthlyFinance.Should().HaveCount(12);
        overview.MonthlyFinance.Should().OnlyContain(point => point.Revenue == 0m && point.Expense == 0m);
        overview.ActiveCampaigns.Should().BeEmpty();
        overview.RecentClients.Should().BeEmpty();
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