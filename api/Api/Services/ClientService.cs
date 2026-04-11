using Api.Data;
using Api.Models.DTOs;
using Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace Api.Services;

public class ClientService : IClientService
{
    private readonly AppDbContext _context;

    public ClientService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ClientDto>> GetClientsAsync(Guid userId)
    {
        return await _context.Clients
            .AsNoTracking()
            .Where(c => c.UserId == userId)
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new ClientDto(
                c.Id,
                c.FirstName,
                c.LastName,
                c.Email,
                c.Phone,
                c.CompanyName,
                c.CreatedAt
            ))
            .ToListAsync();
    }

    public async Task<ClientDto?> GetClientByIdAsync(Guid id, Guid userId)
    {
        return await _context.Clients
            .AsNoTracking()
            .Where(c => c.Id == id && c.UserId == userId)
            .Select(c => new ClientDto(
                c.Id,
                c.FirstName,
                c.LastName,
                c.Email,
                c.Phone,
                c.CompanyName,
                c.CreatedAt
            ))
            .FirstOrDefaultAsync();
    }

    public async Task<ClientDto> CreateClientAsync(CreateClientRequest request, Guid userId)
    {
        var firstName = RequireValue(request.FirstName, nameof(request.FirstName));
        var lastName = RequireValue(request.LastName, nameof(request.LastName));
        var normalizedEmail = NormalizeEmail(request.Email, nameof(request.Email));
        var emailExists = await _context.Clients.AnyAsync(c => c.UserId == userId && c.Email == normalizedEmail);
        if (emailExists)
        {
            throw new InvalidOperationException("A client with this email already exists.");
        }

        var client = new Client
        {
            FirstName = firstName,
            LastName = lastName,
            Email = normalizedEmail,
            Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim(),
            CompanyName = string.IsNullOrWhiteSpace(request.CompanyName) ? null : request.CompanyName.Trim(),
            UserId = userId
        };

        _context.Clients.Add(client);
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            throw new InvalidOperationException("A client with this email already exists.");
        }

        return new ClientDto(
            client.Id,
            client.FirstName,
            client.LastName,
            client.Email,
            client.Phone,
            client.CompanyName,
            client.CreatedAt
        );
    }

    public async Task<ClientDto?> UpdateClientAsync(Guid id, UpdateClientRequest request, Guid userId)
    {
        var client = await _context.Clients.FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId);
        if (client is null)
        {
            return null;
        }

        if (request.FirstName is not null)
        {
            client.FirstName = RequireValue(request.FirstName, nameof(request.FirstName));
        }

        if (request.LastName is not null)
        {
            client.LastName = RequireValue(request.LastName, nameof(request.LastName));
        }

        if (request.Email is not null)
        {
            var normalizedEmail = NormalizeEmail(request.Email, nameof(request.Email));
            var emailExists = await _context.Clients.AnyAsync(c => c.UserId == userId && c.Id != id && c.Email == normalizedEmail);
            if (emailExists)
            {
                throw new InvalidOperationException("A client with this email already exists.");
            }

            client.Email = normalizedEmail;
        }

        if (request.Phone is not null)
        {
            client.Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();
        }

        if (request.CompanyName is not null)
        {
            client.CompanyName = string.IsNullOrWhiteSpace(request.CompanyName) ? null : request.CompanyName.Trim();
        }

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            throw new InvalidOperationException("A client with this email already exists.");
        }

        return new ClientDto(
            client.Id,
            client.FirstName,
            client.LastName,
            client.Email,
            client.Phone,
            client.CompanyName,
            client.CreatedAt
        );
    }

    public async Task<bool> DeleteClientAsync(Guid id, Guid userId)
    {
        var client = await _context.Clients.FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId);
        if (client is null)
        {
            return false;
        }

        _context.Clients.Remove(client);
        await _context.SaveChangesAsync();
        return true;
    }

    private static string RequireValue(string? value, string fieldName)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new ArgumentException($"{fieldName} is required.", fieldName);
        }

        return value.Trim();
    }

    private static string NormalizeEmail(string? value, string fieldName)
    {
        return RequireValue(value, fieldName).ToLowerInvariant();
    }
}