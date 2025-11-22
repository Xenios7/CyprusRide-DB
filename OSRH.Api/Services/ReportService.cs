using OSRH.Api.Data;
using OSRH.Api.Models;
using System.Data;
using System.Data.SqlClient;

namespace OSRH.Api.Services
{
    public class ReportService
    {
        private readonly SqlDataAccess _dataAccess;

        public ReportService(SqlDataAccess dataAccess)
        {
            _dataAccess = dataAccess;
        }

        // Διορθωμένη μέθοδος: Καλούμε το Stored Procedure με το σωστό όνομα
        public async Task<List<CostAnalysisReportModel>> GetCostAnalysisAsync()
        {
            // 1. Καλούμε τη βάση, δηλώνοντας ότι τρέχουμε ένα Stored Procedure
            DataTable dt = await _dataAccess.LoadDataAsync(
                "dbo.sp_GetCostAnalysisReport",
                null,
                CommandType.StoredProcedure
            );

            // 2. Μετατροπή του DataTable σε λίστα C# Models
            var results = new List<CostAnalysisReportModel>();
            foreach (DataRow row in dt.Rows)
            {
                results.Add(new CostAnalysisReportModel
                {
                    // Χρησιμοποιούμε τα GetOrdinal/Field<T> για να διασφαλίσουμε σωστή ανάγνωση τύπων
                    ServiceId = row.Field<int>("service_id"),
                    ServiceName = row.Field<string>("ServiceName") ?? string.Empty,
                    TotalTripsCompleted = row.Field<int>("TotalTripsCompleted"),
                    AverageTripCost = row.Field<decimal>("AverageTripCost"),
                    AverageTripDistanceKm = row.Field<decimal>("AverageTripDistance_km"),
                    HighestCostInService = row.Field<decimal?>("HighestCostInService")
                });
            }

            return results;
        }
        
        // Προσθέστε εδώ και άλλες methods για τις άλλες αναφορές (Performance, Trends) όταν τις χρειαστείτε.
    }
}