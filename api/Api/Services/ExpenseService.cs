using Api.Data;
using Api.Models.DTOs;
using Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace Api.Services;

public class ExpenseService : IExpenseService
{
    private readonly AppDbContext _context;

    public ExpenseService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ExpenseDto>> GetExpensesAsync(Guid userId)
    {
        return await _context.Expenses
            .AsNoTracking()
            .Include(e => e.Tag)
            .Where(e => e.UserId == userId)
            .OrderByDescending(e => e.Date)
            .ThenByDescending(e => e.CreatedAt)
            .Select(e => new ExpenseDto(
                e.Id,
                e.Name,
                e.Amount,
                e.Date,
                e.TagId,
                e.Tag != null ? e.Tag.Name : null,
                e.CreatedAt
            ))
            .ToListAsync();
    }

    public async Task<ExpenseDto?> GetExpenseByIdAsync(Guid id, Guid userId)
    {
        return await _context.Expenses
            .AsNoTracking()
            .Include(e => e.Tag)
            .Where(e => e.Id == id && e.UserId == userId)
            .Select(e => new ExpenseDto(
                e.Id,
                e.Name,
                e.Amount,
                e.Date,
                e.TagId,
                e.Tag != null ? e.Tag.Name : null,
                e.CreatedAt
            ))
            .FirstOrDefaultAsync();
    }

    public async Task<ExpenseDto> CreateExpenseAsync(CreateExpenseRequest request, Guid userId)
    {
        if (request.TagId.HasValue)
        {
            await EnsureTagExistsForUserAsync(request.TagId.Value, userId);
        }

        var expense = new Expense
        {
            Name = request.Name.Trim(),
            Amount = request.Amount,
            Date = request.Date,
            TagId = request.TagId,
            UserId = userId
        };

        _context.Expenses.Add(expense);
        await _context.SaveChangesAsync();

        var tagName = expense.TagId.HasValue
            ? await _context.Tags.Where(t => t.Id == expense.TagId.Value).Select(t => t.Name).FirstOrDefaultAsync()
            : null;

        return new ExpenseDto(
            expense.Id,
            expense.Name,
            expense.Amount,
            expense.Date,
            expense.TagId,
            tagName,
            expense.CreatedAt
        );
    }

    public async Task<ExpenseDto?> UpdateExpenseAsync(Guid id, UpdateExpenseRequest request, Guid userId)
    {
        var expense = await _context.Expenses.FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId);
        if (expense is null)
        {
            return null;
        }

        if (!string.IsNullOrWhiteSpace(request.Name))
        {
            expense.Name = request.Name.Trim();
        }

        if (request.Amount.HasValue)
        {
            expense.Amount = request.Amount.Value;
        }

        if (request.Date.HasValue)
        {
            expense.Date = request.Date.Value;
        }

        if (request.TagId.HasValue)
        {
            await EnsureTagExistsForUserAsync(request.TagId.Value, userId);
            expense.TagId = request.TagId.Value;
        }

        await _context.SaveChangesAsync();

        var tagName = expense.TagId.HasValue
            ? await _context.Tags.Where(t => t.Id == expense.TagId.Value).Select(t => t.Name).FirstOrDefaultAsync()
            : null;

        return new ExpenseDto(
            expense.Id,
            expense.Name,
            expense.Amount,
            expense.Date,
            expense.TagId,
            tagName,
            expense.CreatedAt
        );
    }

    public async Task<bool> DeleteExpenseAsync(Guid id, Guid userId)
    {
        var expense = await _context.Expenses.FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId);
        if (expense is null)
        {
            return false;
        }

        _context.Expenses.Remove(expense);
        await _context.SaveChangesAsync();
        return true;
    }

    private async Task EnsureTagExistsForUserAsync(Guid tagId, Guid userId)
    {
        var exists = await _context.Tags.AnyAsync(t => t.Id == tagId && t.UserId == userId);
        if (!exists)
        {
            throw new InvalidOperationException("Tag not found.");
        }
    }
}