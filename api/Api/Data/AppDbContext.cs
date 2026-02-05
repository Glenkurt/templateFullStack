using Microsoft.EntityFrameworkCore;
using Api.Models.Entities;

namespace Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<ApplicationUser> Users => Set<ApplicationUser>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();
    public DbSet<Subscription> Subscriptions => Set<Subscription>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<ApplicationUser>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.HasIndex(u => u.Email).IsUnique();
            entity.Property(u => u.Email).IsRequired().HasMaxLength(256);
            entity.Property(u => u.PasswordHash).IsRequired();
            entity.Property(u => u.Role).HasMaxLength(50).HasDefaultValue("User");
            entity.Property(u => u.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
        });

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasKey(t => t.Id);
            entity.HasIndex(t => t.TokenHash).IsUnique();
            entity.Property(t => t.TokenHash).IsRequired();
            entity.Property(t => t.ExpiresAt).IsRequired();

            entity.HasOne(t => t.User)
                .WithMany(u => u.RefreshTokens)
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PasswordResetToken>(entity =>
        {
            entity.HasKey(t => t.Id);
            entity.HasIndex(t => t.Token).IsUnique();
            entity.Property(t => t.Token).IsRequired();
            entity.Property(t => t.ExpiresAt).IsRequired();
            entity.Property(t => t.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(t => t.User)
                .WithMany()
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Subscription>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.HasIndex(s => s.UserId).IsUnique();
            entity.HasIndex(s => s.StripeCustomerId);
            entity.HasIndex(s => s.StripeSubscriptionId);
            entity.Property(s => s.Status).HasMaxLength(50).HasDefaultValue("inactive");
            entity.Property(s => s.PlanId).HasMaxLength(50);
            entity.Property(s => s.StripePriceId).HasMaxLength(100);
            entity.Property(s => s.StripeCustomerId).HasMaxLength(100);
            entity.Property(s => s.StripeSubscriptionId).HasMaxLength(100);
            entity.Property(s => s.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(s => s.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(s => s.User)
                .WithOne(u => u.Subscription)
                .HasForeignKey<Subscription>(s => s.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
