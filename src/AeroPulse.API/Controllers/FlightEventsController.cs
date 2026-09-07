using System.Threading.Tasks;
using AeroPulse.Application.DTOs;
using AeroPulse.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace AeroPulse.API.Controllers;

[ApiController]
[Route("api/flight-events")]
public class FlightEventsController : ControllerBase
{
    private readonly IFlightEventProcessorService _flightEventProcessorService;

    public FlightEventsController(IFlightEventProcessorService flightEventProcessorService)
    {
        _flightEventProcessorService = flightEventProcessorService;
    }

    [HttpPost("delay")]
    public async Task<IActionResult> SimulateDelay([FromBody] FlightDelayDto request)
    {
        await _flightEventProcessorService.ProcessFlightDelayAsync(request);

        return Ok(new { message = $"Uçak {request.AircraftId} için {request.DelayMinutes} dakikalık gecikme sisteme ulaştı. Analiz tamamlandı." });
    }
}
