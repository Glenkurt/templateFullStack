using Api.Models.DTOs;

namespace Api.Services;

public interface IExpenseService
{
    Task<List<ExpenseDto>> GetExpensesAsync(Guid userId);
    Task<ExpenseDto?> GetExpenseByIdAsync(Guid id, Guid userId);
    Task<ExpenseDto> CreateExpenseAsync(CreateExpenseRequest request, Guid userId);
    Task<ExpenseDto?> UpdateExpenseAsync(Guid id, UpdateExpenseRequest request, Guid userId);
    Task<bool> DeleteExpenseAsync(Guid id, Guid userId);
}