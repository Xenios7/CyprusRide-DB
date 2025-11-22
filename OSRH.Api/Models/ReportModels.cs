namespace OSRH.Api.Models
{
    // Αυτή η κλάση αντικατοπτρίζει τα αποτελέσματα του sp_GetCostAnalysisReport
    public class CostAnalysisReportModel
    {
        public int ServiceId { get; set; }
        public string ServiceName { get; set; } = string.Empty;
        public int TotalTripsCompleted { get; set; }
        public decimal AverageTripCost { get; set; }
        public decimal AverageTripDistanceKm { get; set; }
        public decimal? HighestCostInService { get; set; } // Nullable γιατί μπορεί να είναι NULL
    }
}