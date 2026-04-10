using Api.Models.DTOs;

namespace Api.Services;

public interface IClientService
{
    Task<List<ClientDto>> GetClientsAsync(Guid userId);
    Task<ClientDto?> GetClientByIdAsync(Guid id, Guid userId);
    Task<ClientDto> CreateClientAsync(CreateClientRequest request, Guid userId);
    Task<ClientDto?> UpdateClientAsync(Guid id, UpdateClientRequest request, Guid userId);
    Task<bool> DeleteClientAsync(Guid id, Guid userId);
}