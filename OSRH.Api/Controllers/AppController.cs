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
            string password = loginData["password"]!.ToString();

            // --- ΔΙΟΡΘΩΣΗ: Χρήση των σωστών ονομάτων στηλών (password_hash, first_name, last_name) ---
            string authSql = "SELECT user_id, first_name, last_name, password_hash FROM dbo.[USER] WHERE username = @u";
            
            var userDt = await _db.LoadDataAsync(authSql, new[] { new SqlParameter("@u", username) });

            // Έλεγχος αν βρέθηκε ο χρήστης
            if (userDt.Rows.Count == 0)
            {
                return Unauthorized(new { message = "Ο χρήστης δεν βρέθηκε." });
            }

            // Έλεγχος κωδικού (Σύγκριση με το password_hash από τη βάση)
            string dbPassword = userDt.Rows[0]["password_hash"].ToString();
            if (dbPassword != password)
            {
                return Unauthorized(new { message = "Λάθος κωδικός πρόσβασης." });
            }

            int userId = (int)userDt.Rows[0]["user_id"];
            string fullName = $"{userDt.Rows[0]["first_name"]} {userDt.Rows[0]["last_name"]}";
            
            // 2. ΕΚΤΕΛΕΣΗ SP ΓΙΑ ΤΟΥΣ ΡΟΛΟΥΣ (Logic moved to DB)
            var roleDt = await _db.LoadDataAsync(
                "dbo.sp_GetUserRoles", 
                new[] { new SqlParameter("@UserId", userId) }, 
                CommandType.StoredProcedure
            );

            List<string> roles = new List<string>();
            foreach (System.Data.DataRow row in roleDt.Rows)
            {
                roles.Add(row["role_name"].ToString());
            }
            
            return Ok(new 
            { 
                username = username, 
                name = fullName,
                roles = roles
            });
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
        // 5. PASSENGER: Create New Request
 // 5. PASSENGER: Create New Request (Διορθωμένη για να επιστρέφει το ID)
// 5. PASSENGER: Create New Request (ΔΙΟΡΘΩΜΕΝΗ ΜΕΘΟΔΟΣ ΓΙΑ ΝΑ ΕΠΙΣΤΡΕΦΕΙ ΤΟ ID)
        [HttpPost("passenger/request")]
        public async Task<IActionResult> CreateRequest([FromBody] JsonObject reqData)
        {
            // Ανάκτηση παραμέτρων (username, serviceId, notes, κτλ.)
            string username = reqData["username"]!.ToString();
            int serviceId = int.Parse(reqData["serviceId"]!.ToString());
            string notes = reqData["notes"]?.ToString() ?? "";

            // --- Στοιχεία Διαδρομής (Hardcoded για demo) ---
            decimal pickupLat = 35.1700m;
            decimal pickupLon = 33.3600m;
            decimal dropoffLat = 34.9200m;
            decimal dropoffLon = 33.6300m;
            decimal estimatedFare = 15.50m; // Simplified estimation

            // 1. Βρες το User ID
            var userDt = await _db.LoadDataAsync("SELECT user_id FROM dbo.[USER] WHERE username = @u", 
                new[] { new SqlParameter("@u", username) });
            
            if (userDt.Rows.Count == 0) return NotFound(new { message = "User not found." });
            int userId = (int)userDt.Rows[0]["user_id"];

            // 2. SQL: INSERT & SELECT SCOPE_IDENTITY()
            string sql = @"
                INSERT INTO dbo.TRANSPORT_REQUEST 
                (user_id, service_id, request_time, status, estimated_fare, pickup_latitude, pickup_longitude, dropoff_latitude, dropoff_longitude, notes)
                VALUES (@uid, @sid, GETDATE(), 'Open', @fare, @plat, @plon, @dlat, @dlon, @notes);
                
                SELECT SCOPE_IDENTITY() AS RequestId;"; // <-- Επιστρέφει το ID
            
            // 3. Παράμετροι (χρειάζονται όλα τα στοιχεία)
            var parameters = new SqlParameter[] {
                new SqlParameter("@uid", userId),
                new SqlParameter("@sid", serviceId),
                new SqlParameter("@fare", estimatedFare),
                new SqlParameter("@plat", pickupLat),
                new SqlParameter("@plon", pickupLon),
                new SqlParameter("@dlat", dropoffLat),
                new SqlParameter("@dlon", dropoffLon),
                new SqlParameter("@notes", notes)
            };

            // 4. ΕΚΤΕΛΕΣΗ: Χρησιμοποιούμε LoadDataAsync και παίρνουμε τον DataTable
            DataTable dt = await _db.LoadDataAsync(sql, parameters);
            
            // 5. Ανάκτηση του νέου ID και μετατροπή σε INT
            // Το SCOPE_IDENTITY() επιστρέφεται ως decimal, πρέπει να το κάνουμε cast
            decimal newRequestIdDecimal = (decimal)dt.Rows[0]["RequestId"];
            int newRequestId = (int)newRequestIdDecimal;

            // 6. Επιστροφή επιτυχίας και του ID (για χρήση στο Frontend)
            return Ok(new { message = "Το αίτημα καταχωρήθηκε επιτυχώς!", requestId = newRequestId });
        }

        // 6. PASSENGER: View My History
        [HttpGet("passenger/history/{username}")]
        public async Task<IActionResult> GetPassengerHistory(string username)
        {
            string sql = @"
                SELECT * FROM dbo.v_TripHistory 
                WHERE PassengerUsername = @u 
                ORDER BY request_time DESC";
            
            var dt = await _db.LoadDataAsync(sql, new[] { new SqlParameter("@u", username) });
            return Ok(ConvertDataTableToDict(dt));
        }

        // 7. PASSENGER: Get Offers for a specific Request
        [HttpGet("passenger/offers/{requestId}")]
        public async Task<IActionResult> GetOffers(int requestId)
        {
            var dt = await _db.LoadDataAsync(
                "dbo.sp_GetOffersForRequest", 
                new[] { new SqlParameter("@RequestId", requestId) }, 
                CommandType.StoredProcedure
            );
            return Ok(ConvertDataTableToDict(dt));
        }

        // 8. PASSENGER: Accept an Offer
        [HttpPost("passenger/accept-offer")]
        public async Task<IActionResult> AcceptOffer([FromBody] JsonObject data)
        {
            int offerId = int.Parse(data["offerId"]!.ToString());
            int requestId = int.Parse(data["requestId"]!.ToString());

            var parameters = new SqlParameter[] {
                new SqlParameter("@OfferId", offerId),
                new SqlParameter("@RequestId", requestId)
            };

            await _db.ExecuteAsync(
                "dbo.sp_AcceptOffer", 
                parameters, 
                CommandType.StoredProcedure
            );

            return Ok(new { message = "Η διαδρομή ξεκίνησε! Καλό ταξίδι." });
        }

        // 9. DRIVER: Submit Offer for a Request
        // (Χρειάζεται να βρεθεί το driverId του συνδεδεμένου χρήστη)
        [HttpPost("driver/submit-offer")]
        public async Task<IActionResult> SubmitOffer([FromBody] JsonObject offerData)
        {
            // Ανάκτηση των απαραίτητων παραμέτρων από το frontend (Driver ID και Offer Details)
            int requestId = int.Parse(offerData["requestId"]!.ToString());
            int driverId = int.Parse(offerData["driverId"]!.ToString()); // Driver ID του συνδεδεμένου χρήστη
            int vehicleId = int.Parse(offerData["vehicleId"]!.ToString());
            decimal estimatedCost = decimal.Parse(offerData["estimatedCost"]!.ToString());
            
            // Τυχαία απόσταση για το demo
            decimal distanceToPickup = (decimal) (1.0 + new Random().NextDouble() * 5.0); 

            var parameters = new SqlParameter[] {
                new SqlParameter("@RequestId", requestId),
                new SqlParameter("@DriverId", driverId),
                new SqlParameter("@VehicleId", vehicleId),
                new SqlParameter("@EstimatedCost", estimatedCost),
                new SqlParameter("@DistanceToPickup", distanceToPickup)
            };

            // Εκτέλεση του SP και λήψη του αποτελέσματος (Success/Message)
            var dt = await _db.LoadDataAsync(
                "dbo.sp_SubmitOffer", 
                parameters, 
                CommandType.StoredProcedure
            );

            // Ελέγχουμε την απάντηση του SQL Server
            if ((int)dt.Rows[0]["Success"] == 1)
            {
                return Ok(new { message = dt.Rows[0]["Message"].ToString() });
            }
            return BadRequest(new { message = dt.Rows[0]["Message"].ToString() });
        }
    }
}