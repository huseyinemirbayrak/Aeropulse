namespace AeroPulse.Application.DTOs;

public class FlightDelayDto
{
    public string AircraftId { get; set; } = string.Empty;
    public int DelayMinutes { get; set; }
}
