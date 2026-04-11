using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Api.Data;
using Api.Models.DTOs;
using Api.Models.Entities;
using FluentAssertions;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Api.Tests.Integration;

public class ExpenseRevenueEndpointTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public ExpenseRevenueEndpointTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task CreateExpense_WithoutTag_SerializesAmountAndDateConsistently()
    {
        var email = $"expense-create-{Guid.NewGuid():N}@example.com";
        await AuthenticateAsync(email, "Test@1234");

        var request = new CreateExpenseRequest(
            Name: "Consulting tools",
            Amount: 1234.56m,
            Date: new DateOnly(2026, 4, 11),
            TagId: null);

        var response = await _client.PostAsJsonAsync("/api/v1/expenses", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var rawJson = await response.Content.ReadAsStringAsync();
        rawJson.Should().Contain("\"amount\":1234.56");
        rawJson.Should().Contain("\"date\":\"2026-04-11\"");

        var expense = await response.Content.ReadFromJsonAsync<ExpenseDto>();
        expense.Should().NotBeNull();
        expense!.TagId.Should().BeNull();
        expense.TagName.Should().BeNull();
        expense.Amount.Should().Be(1234.56m);
        expense.Date.Should().Be(new DateOnly(2026, 4, 11));
    }

    [Fact]
    public async Task PatchExpense_WithNullTagId_ClearsRelation()
    {
        var email = $"expense-patch-{Guid.NewGuid():N}@example.com";
        var userId = await EnsureUserAsync(email, "Test@1234");
        await AuthenticateAsync(email, "Test@1234");

        Guid expenseId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var tag = new Tag
            {
                Name = "Software",
                Category = TagCategory.Expense,
                UserId = userId
            };

            var expense = new Expense
            {
                Name = "SaaS",
                Amount = 99.90m,
                Date = new DateOnly(2026, 4, 10),
                Tag = tag,
                UserId = userId
            };

            db.Expenses.Add(expense);
            await db.SaveChangesAsync();
            expenseId = expense.Id;
        }

        var request = new HttpRequestMessage(HttpMethod.Patch, $"/api/v1/expenses/{expenseId}")
        {
            Content = JsonContent.Create(new { tagId = (Guid?)null })
        };

        var response = await _client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var expenseDto = await response.Content.ReadFromJsonAsync<ExpenseDto>();
        expenseDto.Should().NotBeNull();
        expenseDto!.TagId.Should().BeNull();
        expenseDto.TagName.Should().BeNull();

        using var verificationScope = _factory.Services.CreateScope();
        var verificationDb = verificationScope.ServiceProvider.GetRequiredService<AppDbContext>();
        var storedExpense = await verificationDb.Expenses.FindAsync(expenseId);
        storedExpense.Should().NotBeNull();
        storedExpense!.TagId.Should().BeNull();
    }

    [Fact]
    public async Task CreateExpense_WithOtherUsersTag_ReturnsBadRequest()
    {
        var ownerEmail = $"expense-owner-{Guid.NewGuid():N}@example.com";
        var otherEmail = $"expense-other-{Guid.NewGuid():N}@example.com";
        await AuthenticateAsync(ownerEmail, "Test@1234");
        var otherUserId = await EnsureUserAsync(otherEmail, "Test@1234");

        Guid otherTagId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var tag = new Tag
            {
                Name = "Foreign Expense Tag",
                Category = TagCategory.Expense,
                UserId = otherUserId
            };

            db.Tags.Add(tag);
            await db.SaveChangesAsync();
            otherTagId = tag.Id;
        }

        var response = await _client.PostAsJsonAsync(
            "/api/v1/expenses",
            new CreateExpenseRequest("Travel", 150m, new DateOnly(2026, 4, 11), otherTagId));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        problem.Should().NotBeNull();
        problem!.Detail.Should().Be("Tag not found.");
    }

    [Fact]
    public async Task CreateExpense_WithRevenueTag_ReturnsBadRequest()
    {
        var email = $"expense-category-{Guid.NewGuid():N}@example.com";
        var userId = await EnsureUserAsync(email, "Test@1234");
        await AuthenticateAsync(email, "Test@1234");

        Guid tagId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var tag = new Tag
            {
                Name = "Revenue only",
                Category = TagCategory.Revenue,
                UserId = userId
            };

            db.Tags.Add(tag);
            await db.SaveChangesAsync();
            tagId = tag.Id;
        }

        var response = await _client.PostAsJsonAsync(
            "/api/v1/expenses",
            new CreateExpenseRequest("Travel", 150m, new DateOnly(2026, 4, 11), tagId));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        problem.Should().NotBeNull();
        problem!.Detail.Should().Be("Tag category is invalid.");
    }

    [Fact]
    public async Task CreateRevenue_WithOtherUsersClient_ReturnsBadRequest()
    {
        var ownerEmail = $"revenue-owner-{Guid.NewGuid():N}@example.com";
        var otherEmail = $"revenue-other-{Guid.NewGuid():N}@example.com";
        await AuthenticateAsync(ownerEmail, "Test@1234");
        var otherUserId = await EnsureUserAsync(otherEmail, "Test@1234");

        Guid foreignClientId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var client = new Client
            {
                FirstName = "Other",
                LastName = "Owner",
                Email = $"foreign-client-{Guid.NewGuid():N}@example.com",
                UserId = otherUserId
            };

            db.Clients.Add(client);
            await db.SaveChangesAsync();
            foreignClientId = client.Id;
        }

        var response = await _client.PostAsJsonAsync(
            "/api/v1/revenues",
            new CreateRevenueRequest(450m, new DateOnly(2026, 4, 11), null, foreignClientId));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        problem.Should().NotBeNull();
        problem!.Detail.Should().Be("Client not found.");
    }

    [Fact]
    public async Task CreateRevenue_WithOwnedRelations_ReturnsCreatedDto()
    {
        var email = $"revenue-create-{Guid.NewGuid():N}@example.com";
        var userId = await EnsureUserAsync(email, "Test@1234");
        await AuthenticateAsync(email, "Test@1234");

        Guid tagId;
        Guid clientId;

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var tag = new Tag
            {
                Name = "Consulting",
                Category = TagCategory.Revenue,
                UserId = userId
            };
            var client = new Client
            {
                FirstName = "Alice",
                LastName = "Martin",
                Email = $"revenue-owned-client-{Guid.NewGuid():N}@example.com",
                UserId = userId
            };

            db.Tags.Add(tag);
            db.Clients.Add(client);
            await db.SaveChangesAsync();

            tagId = tag.Id;
            clientId = client.Id;
        }

        var request = new CreateRevenueRequest(
            Amount: 875.40m,
            Date: new DateOnly(2026, 4, 11),
            TagId: tagId,
            ClientId: clientId);

        var response = await _client.PostAsJsonAsync("/api/v1/revenues", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var rawJson = await response.Content.ReadAsStringAsync();
        rawJson.Should().Contain("\"amount\":875.40");
        rawJson.Should().Contain("\"date\":\"2026-04-11\"");

        var revenue = await response.Content.ReadFromJsonAsync<RevenueDto>();
        revenue.Should().NotBeNull();
        revenue!.Amount.Should().Be(875.40m);
        revenue.Date.Should().Be(new DateOnly(2026, 4, 11));
        revenue.TagId.Should().Be(tagId);
        revenue.TagName.Should().Be("Consulting");
        revenue.ClientId.Should().Be(clientId);
        revenue.ClientName.Should().Be("Alice Martin");
    }

    [Fact]
    public async Task PatchRevenue_WithNullRelations_ClearsTagAndClient()
    {
        var email = $"revenue-patch-{Guid.NewGuid():N}@example.com";
        var userId = await EnsureUserAsync(email, "Test@1234");
        await AuthenticateAsync(email, "Test@1234");

        Guid revenueId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var tag = new Tag
            {
                Name = "Services",
                Category = TagCategory.Revenue,
                UserId = userId
            };
            var client = new Client
            {
                FirstName = "Jane",
                LastName = "Doe",
                Email = $"revenue-client-{Guid.NewGuid():N}@example.com",
                UserId = userId
            };
            var revenue = new Revenue
            {
                Amount = 700m,
                Date = new DateOnly(2026, 4, 10),
                Tag = tag,
                Client = client,
                UserId = userId
            };

            db.Revenues.Add(revenue);
            await db.SaveChangesAsync();
            revenueId = revenue.Id;
        }

        var request = new HttpRequestMessage(HttpMethod.Patch, $"/api/v1/revenues/{revenueId}")
        {
            Content = JsonContent.Create(new { tagId = (Guid?)null, clientId = (Guid?)null })
        };

        var response = await _client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var revenueDto = await response.Content.ReadFromJsonAsync<RevenueDto>();
        revenueDto.Should().NotBeNull();
        revenueDto!.TagId.Should().BeNull();
        revenueDto.TagName.Should().BeNull();
        revenueDto.ClientId.Should().BeNull();
        revenueDto.ClientName.Should().BeNull();

        using var verificationScope = _factory.Services.CreateScope();
        var verificationDb = verificationScope.ServiceProvider.GetRequiredService<AppDbContext>();
        var storedRevenue = await verificationDb.Revenues.FindAsync(revenueId);
        storedRevenue.Should().NotBeNull();
        storedRevenue!.TagId.Should().BeNull();
        storedRevenue.ClientId.Should().BeNull();
    }

    [Fact]
    public async Task GetRevenues_DoesNotLeakCrossUserClientOrTagData()
    {
        var ownerEmail = $"revenue-list-owner-{Guid.NewGuid():N}@example.com";
        var ownerId = await EnsureUserAsync(ownerEmail, "Test@1234");
        var otherId = await EnsureUserAsync($"revenue-list-other-{Guid.NewGuid():N}@example.com", "Test@1234");
        await AuthenticateAsync(ownerEmail, "Test@1234");

        Guid revenueId;
        Guid foreignTagId;
        Guid foreignClientId;

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var foreignTag = new Tag
            {
                Name = "Other user tag",
                Category = TagCategory.Revenue,
                UserId = otherId
            };
            var foreignClient = new Client
            {
                FirstName = "Foreign",
                LastName = "Client",
                Email = $"foreign-list-client-{Guid.NewGuid():N}@example.com",
                UserId = otherId
            };

            db.Tags.Add(foreignTag);
            db.Clients.Add(foreignClient);
            await db.SaveChangesAsync();

            foreignTagId = foreignTag.Id;
            foreignClientId = foreignClient.Id;

            var revenueEntity = new Revenue
            {
                Amount = 250m,
                Date = new DateOnly(2026, 4, 11),
                TagId = foreignTagId,
                ClientId = foreignClientId,
                UserId = ownerId
            };

            db.Revenues.Add(revenueEntity);
            await db.SaveChangesAsync();
            revenueId = revenueEntity.Id;
        }

        var response = await _client.GetAsync("/api/v1/revenues");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var revenues = await response.Content.ReadFromJsonAsync<List<RevenueDto>>();
        revenues.Should().NotBeNull();

        var revenue = revenues!.Should().ContainSingle(r => r.Id == revenueId).Subject;
        revenue.TagId.Should().BeNull();
        revenue.TagName.Should().BeNull();
        revenue.ClientId.Should().BeNull();
        revenue.ClientName.Should().BeNull();
    }

    private async Task AuthenticateAsync(string email, string password)
    {
        var token = await GetAccessTokenAsync(email, password);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
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