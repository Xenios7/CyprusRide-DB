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

        public async Task<List<CostAnalysisReportModel>> GetCostAnalysisAsync()
        {
            DataTable dt = await _dataAccess.LoadDataAsync(
                "dbo.sp_GetCostAnalysisReport",
                null,
                CommandType.StoredProcedure
            );

            var results = new List<CostAnalysisReportModel>();
            foreach (DataRow row in dt.Rows)
            {
                results.Add(new CostAnalysisReportModel
                {
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
        
    }
}