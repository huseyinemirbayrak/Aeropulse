using AeroPulse.Domain.Entities;

namespace AeroPulse.Application.Interfaces;

public interface IJwtService
{
    string GenerateToken(User user);
}
