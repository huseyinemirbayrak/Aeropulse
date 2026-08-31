using AeroPulse.Application.DTOs;
using AeroPulse.Application.Interfaces;
using AeroPulse.Domain.Entities;
using AeroPulse.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace AeroPulse.Application.Services;

public interface IAeroPulseDbContext
{
    DbSet<User> Users { get; }
    DbSet<Aircraft> Aircraft { get; }
    DbSet<Part> Parts { get; }
    DbSet<MaintenanceRecord> MaintenanceRecords { get; }
    DbSet<FaultReport> FaultReports { get; }
    DbSet<Operation> Operations { get; }
    DbSet<SLARule> SLARules { get; }
    DbSet<Notification> Notifications { get; }
    DbSet<JetBridge> JetBridges { get; }
    DbSet<JetBridgeAssignment> JetBridgeAssignments { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

public class AuthService : IAuthService
{
    private readonly IAeroPulseDbContext _context;
    private readonly IJwtService _jwtService;

    public AuthService(IAeroPulseDbContext context, IJwtService jwtService)
    {
        _context = context;
        _jwtService = jwtService;
    }

    public async Task<ApiResponse<AuthResponseDto>> LoginAsync(LoginRequestDto request)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return ApiResponse<AuthResponseDto>.Fail("Invalid email or password.");

        if (!user.IsActive)
            return ApiResponse<AuthResponseDto>.Fail("Account is deactivated. Contact administrator.");

        var token = _jwtService.GenerateToken(user);
        return ApiResponse<AuthResponseDto>.Ok(new AuthResponseDto
        {
            Token = token,
            User = MapToUserDto(user)
        }, "Login successful.");
    }

    public async Task<ApiResponse<AuthResponseDto>> RegisterAsync(RegisterRequestDto request)
    {
        if (await _context.Users.AnyAsync(u => u.Email == request.Email))
            return ApiResponse<AuthResponseDto>.Fail("Email already registered.");

        var user = new User
        {
            FullName = request.FullName,
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = request.Role,
            IsActive = true
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var token = _jwtService.GenerateToken(user);
        return ApiResponse<AuthResponseDto>.Ok(new AuthResponseDto
        {
            Token = token,
            User = MapToUserDto(user)
        }, "Registration successful.");
    }

    public async Task<ApiResponse<UserDto>> GetCurrentUserAsync(Guid userId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            return ApiResponse<UserDto>.Fail("User not found.");

        return ApiResponse<UserDto>.Ok(MapToUserDto(user));
    }

    public async Task<ApiResponse<List<UserDto>>> GetAllUsersAsync()
    {
        var users = await _context.Users
            .OrderByDescending(u => u.CreatedAt)
            .Select(u => new UserDto
            {
                Id = u.Id,
                FullName = u.FullName,
                Email = u.Email,
                Role = u.Role,
                IsActive = u.IsActive,
                CreatedAt = u.CreatedAt
            })
            .ToListAsync();

        return ApiResponse<List<UserDto>>.Ok(users);
    }

    public async Task<ApiResponse<UserDto>> UpdateUserAsync(Guid id, UpdateUserDto request)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
            return ApiResponse<UserDto>.Fail("User not found.");

        if (!string.IsNullOrEmpty(request.FullName)) user.FullName = request.FullName;
        if (!string.IsNullOrEmpty(request.Email))
        {
            if (await _context.Users.AnyAsync(u => u.Email == request.Email && u.Id != id))
                return ApiResponse<UserDto>.Fail("Email already in use.");
            user.Email = request.Email;
        }
        if (request.Role.HasValue) user.Role = request.Role.Value;
        if (request.IsActive.HasValue) user.IsActive = request.IsActive.Value;
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return ApiResponse<UserDto>.Ok(MapToUserDto(user), "User updated successfully.");
    }

    public async Task<ApiResponse<bool>> DeactivateUserAsync(Guid id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
            return ApiResponse<bool>.Fail("User not found.");

        user.IsActive = false;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return ApiResponse<bool>.Ok(true, "User deactivated.");
    }

    private static UserDto MapToUserDto(User user) => new()
    {
        Id = user.Id,
        FullName = user.FullName,
        Email = user.Email,
        Role = user.Role,
        IsActive = user.IsActive,
        CreatedAt = user.CreatedAt
    };
}
