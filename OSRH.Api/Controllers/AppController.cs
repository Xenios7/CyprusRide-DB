using Microsoft.AspNetCore.Mvc;
using OSRH.Api.Data;
using System.Data;
using System.Data.SqlClient;
using System.Text.Json.Nodes;

namespace OSRH.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AppController : ControllerBase
    {
        private readonly SqlDataAccess _db;

        public AppController(SqlDataAccess db)
        {
            _db = db;
        }

        // 1. LOGIN (Απαίτηση: Οι χρήστες πρέπει να εισάγουν κωδικό)
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] JsonObject loginData)
        {
            string username = loginData["username"]!.ToString();
            string password = loginData["password"]!.ToString(); // Σημείωση: Στο demo η σύγκριση είναι απλή.

            string sql = "SELECT user_id, username, first_name, last_name FROM dbo.[USER] WHERE username = @u AND password_hash = @p";
            
            var parameters = new SqlParameter[] {
                new SqlParameter("@u", username),
                new SqlParameter("@p", password)
            };

            DataTable result = await _db.LoadDataAsync(sql, parameters);

            if (result.Rows.Count > 0)
            {
                var user = result.Rows[0];
                return Ok(new { 
                    UserId = user["user_id"], 
                    Username = user["username"],
                    Name = $"{user["first_name"]} {user["last_name"]}"
                });
            }
            return Unauthorized("Λάθος όνομα χρήστη ή κωδικός.");
        }

        // 2. REPORT: Cost Analysis (Admin)
        [HttpGet("reports/cost")]
        public async Task<IActionResult> GetCostReport()
        {
            // Καλεί το Stored Procedure που φτιάξαμε
            var dt = await _db.LoadDataAsync("dbo.sp_GetCostAnalysisReport", null, CommandType.StoredProcedure);
            return Ok(ConvertDataTableToDict(dt));
        }

        // 3. REPORT: Driver Performance (Admin)
        [HttpGet("reports/driver-performance")]
        public async Task<IActionResult> GetDriverPerformance()
        {
            var dt = await _db.LoadDataAsync("dbo.sp_GetDriverPerformance", null, CommandType.StoredProcedure);
            return Ok(ConvertDataTableToDict(dt));
        }

        // 4. DRIVER: View Open Requests
        // Χρησιμοποιεί το View 'v_OpenRequests' που φτιάξαμε
        [HttpGet("driver/open-requests")]
        public async Task<IActionResult> GetOpenRequests()
        {
            var dt = await _db.LoadDataAsync("SELECT * FROM dbo.v_OpenRequests");
            return Ok(ConvertDataTableToDict(dt));
        }

        // Helper: Μετατροπή DataTable σε JSON List για το frontend
        private List<Dictionary<string, object>> ConvertDataTableToDict(DataTable dt)
        {
            var columns = dt.Columns.Cast<DataColumn>();
            return dt.AsEnumerable().Select(dataRow => columns.Select(column =>
                new { column.ColumnName, Value = dataRow[column] })
                .ToDictionary(data => data.ColumnName, data => data.Value)).ToList();
        }
    }
}