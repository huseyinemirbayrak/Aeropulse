using AeroPulse.Domain.Enums;

namespace AeroPulse.Domain.Entities;

public class JetBridge : BaseEntity
{
    public string BridgeNo { get; set; } = string.Empty;
    public string TerminalNo { get; set; } = string.Empty;
    public JetBridgeStatus StatusCode { get; set; } = JetBridgeStatus.Available;

    // Navigation properties
    public ICollection<JetBridgeAssignment> Assignments { get; set; } = new List<JetBridgeAssignment>();
}
