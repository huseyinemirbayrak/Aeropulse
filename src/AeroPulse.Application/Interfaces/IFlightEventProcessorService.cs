using AeroPulse.Application.DTOs;
using System.Threading.Tasks;

namespace AeroPulse.Application.Interfaces;

public interface IFlightEventProcessorService
{
    Task ProcessFlightDelayAsync(FlightDelayDto delayDto);
}
