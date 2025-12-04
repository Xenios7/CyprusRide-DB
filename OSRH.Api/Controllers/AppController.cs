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

        // ==========================================
        // 1. AUTHENTICATION
        // ==========================================
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] JsonObject loginData)
        {
            string username = loginData["username"]?.ToString() ?? "";
            string password = loginData["password"]?.ToString() ?? "";

            var dt = await _db.LoadDataAsync("dbo.sp_LoginUser", 
                new[] { new SqlParameter("@Username", username), new SqlParameter("@Password", password) }, 
                CommandType.StoredProcedure);

            if (dt.Rows.Count == 0) return StatusCode(500, new { message = "Server Error: No response." });

            DataRow row = dt.Rows[0];
            int success = Convert.ToInt32(row["Success"]);
            string message = row["Message"].ToString();

            if (success == 0) return Unauthorized(new { message = message });

            string rolesStr = row["Roles"] != DBNull.Value ? row["Roles"]?.ToString() ?? "" : "";
            List<string> roleList = rolesStr.Split(new[] { ',' }, StringSplitOptions.RemoveEmptyEntries).ToList();

            return Ok(new 
            { 
                username = row["Username"]?.ToString() ?? "", 
                name = row["Name"]?.ToString() ?? "",   
                roles = roleList
            });
        }
        
        // ==========================================
        // 2. ADMIN / REPORTS
        // ==========================================
        
        // Report 1: Cost Analysis (with filtering)
        [HttpGet("reports/cost")]
        public async Task<IActionResult> GetCostReport(
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate,
            [FromQuery] string? timePeriod,
            [FromQuery] int? serviceId,
            [FromQuery] string? city,
            [FromQuery] string? country,
            [FromQuery] string? postalCode,
            [FromQuery] decimal? centerLat,
            [FromQuery] decimal? centerLon,
            [FromQuery] decimal? radiusKm,
            [FromQuery] string? groupBy)
        {
            var parameters = new[] {
                new SqlParameter("@StartDate", (object?)startDate ?? DBNull.Value),
                new SqlParameter("@EndDate", (object?)endDate ?? DBNull.Value),
                new SqlParameter("@TimePeriod", (object?)timePeriod ?? DBNull.Value),
                new SqlParameter("@ServiceId", (object?)serviceId ?? DBNull.Value),
                new SqlParameter("@City", (object?)city ?? DBNull.Value),
                new SqlParameter("@Country", (object?)country ?? DBNull.Value),
                new SqlParameter("@PostalCode", (object?)postalCode ?? DBNull.Value),
                new SqlParameter("@CenterLat", (object?)centerLat ?? DBNull.Value),
                new SqlParameter("@CenterLon", (object?)centerLon ?? DBNull.Value),
                new SqlParameter("@RadiusKm", (object?)radiusKm ?? DBNull.Value),
                new SqlParameter("@GroupBy", (object?)groupBy ?? DBNull.Value)
            };
            
            var dt = await _db.LoadDataAsync("dbo.sp_GetCostAnalysisReport", parameters, CommandType.StoredProcedure);
            return Ok(ConvertDataTableToDict(dt));
        }

        // Report 2: Driver Performance (with filtering)
        [HttpGet("reports/driver-performance")]
        public async Task<IActionResult> GetDriverPerformance(
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate,
            [FromQuery] int? serviceId,
            [FromQuery] string? city,
            [FromQuery] int? minTrips,
            [FromQuery] decimal? minRating,
            [FromQuery] string? orderBy)
        {
            var parameters = new[] {
                new SqlParameter("@StartDate", (object?)startDate ?? DBNull.Value),
                new SqlParameter("@EndDate", (object?)endDate ?? DBNull.Value),
                new SqlParameter("@ServiceId", (object?)serviceId ?? DBNull.Value),
                new SqlParameter("@City", (object?)city ?? DBNull.Value),
                new SqlParameter("@MinTrips", (object?)minTrips ?? DBNull.Value),
                new SqlParameter("@MinRating", (object?)minRating ?? DBNull.Value),
                new SqlParameter("@OrderBy", orderBy ?? "TotalTrips")
            };
            
            var dt = await _db.LoadDataAsync("dbo.sp_GetDriverPerformance", parameters, CommandType.StoredProcedure);
            return Ok(ConvertDataTableToDict(dt));
        }

        // Report 3: Trip Statistics
        [HttpGet("reports/trip-statistics")]
        public async Task<IActionResult> GetTripStatistics(
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate,
            [FromQuery] string? city,
            [FromQuery] string? country,
            [FromQuery] string? groupBy)
        {
            var parameters = new[] {
                new SqlParameter("@StartDate", (object?)startDate ?? DBNull.Value),
                new SqlParameter("@EndDate", (object?)endDate ?? DBNull.Value),
                new SqlParameter("@City", (object?)city ?? DBNull.Value),
                new SqlParameter("@Country", (object?)country ?? DBNull.Value),
                new SqlParameter("@GroupBy", (object?)groupBy ?? DBNull.Value)
            };
            
            var dt = await _db.LoadDataAsync("dbo.sp_GetTripStatistics", parameters, CommandType.StoredProcedure);
            return Ok(ConvertDataTableToDict(dt));
        }

        // Report 4: Driver Earnings
        [HttpGet("reports/driver-earnings")]
        public async Task<IActionResult> GetDriverEarnings(
            [FromQuery] string? driverUsername,
            [FromQuery] int? year)
        {
            var parameters = new[] {
                new SqlParameter("@DriverUsername", (object?)driverUsername ?? DBNull.Value),
                new SqlParameter("@Year", (object?)year ?? DBNull.Value)
            };
            
            var dt = await _db.LoadDataAsync("dbo.sp_GetDriverEarnings", parameters, CommandType.StoredProcedure);
            return Ok(ConvertDataTableToDict(dt));
        }

        // Report 5: Peak Activity Periods
        [HttpGet("reports/peak-activity")]
        public async Task<IActionResult> GetPeakActivity(
            [FromQuery] int? serviceId,
            [FromQuery] string? city,
            [FromQuery] string? groupingLevel)
        {
            var parameters = new[] {
                new SqlParameter("@ServiceId", (object?)serviceId ?? DBNull.Value),
                new SqlParameter("@City", (object?)city ?? DBNull.Value),
                new SqlParameter("@GroupingLevel", groupingLevel ?? "Hourly")
            };
            
            var dt = await _db.LoadDataAsync("dbo.sp_GetPeakActivityPeriods", parameters, CommandType.StoredProcedure);
            return Ok(ConvertDataTableToDict(dt));
        }

        [HttpGet("admin/service-types")]
        public async Task<IActionResult> GetServiceTypes()
        {
            var message = new SqlParameter("@Message", SqlDbType.NVarChar, 255)
            {
                Direction = ParameterDirection.Output
            };

            var dt = await _db.LoadDataAsync(
                "dbo.sp_GetServiceTypes",
                new[] 
                { 
                    new SqlParameter("@IncludeInactive", 0), 
                    message 
                },
                CommandType.StoredProcedure
            );

            return Ok(ConvertDataTableToDict(dt));
        }

        // ==========================================
        // ADMIN: VEHICLE STANDARDS
        // ==========================================
        [HttpGet("admin/vehicle-standards")]
        public async Task<IActionResult> GetVehicleStandards()
        {
            var message = new SqlParameter("@Message", SqlDbType.NVarChar, 255)
            {
                Direction = ParameterDirection.Output
            };

            var dt = await _db.LoadDataAsync(
                "dbo.sp_GetVehicleTypes",
                new[] { message },
                CommandType.StoredProcedure
            );

            return Ok(ConvertDataTableToDict(dt));
        }
 
        // ==========================================
        // 3. PASSENGER FEATURES
        // ==========================================

// 5. PASSENGER: Create New Request
        [HttpPost("passenger/request")]
        public async Task<IActionResult> CreateRequest([FromBody] JsonObject reqData)
        {
            try
            {
                // 1. Extract inputs safely (Fixes "Possible null reference" warnings)
                string username = reqData["username"]?.ToString() ?? "";
                
                string serviceIdStr = reqData["serviceId"]?.ToString() ?? "1";
                int.TryParse(serviceIdStr, out int serviceId); // Safe parse

                string notes = reqData["notes"]?.ToString() ?? "";

                // Coordinates (Hardcoded for demo, or parse safely if sent from UI)
                decimal pickupLat = 35.1700m; 
                decimal pickupLon = 33.3600m;
                decimal dropoffLat = 34.9200m; 
                decimal dropoffLon = 33.6300m;
                decimal estimatedFare = 15.50m; 

                var parameters = new SqlParameter[] {
                    new SqlParameter("@Username", username),
                    new SqlParameter("@ServiceId", serviceId),
                    new SqlParameter("@EstimatedFare", estimatedFare),
                    new SqlParameter("@PickupLat", pickupLat),
                    new SqlParameter("@PickupLon", pickupLon),
                    new SqlParameter("@DropoffLat", dropoffLat),
                    new SqlParameter("@DropoffLon", dropoffLon),
                    new SqlParameter("@Notes", notes)
                };

                // 2. Create the Request
                DataTable dt = await _db.LoadDataAsync("dbo.sp_CreateTransportRequest", parameters, CommandType.StoredProcedure);
                
                if (dt.Rows.Count > 0 && dt.Columns.Contains("RequestId"))
                {
                    int newRequestId = Convert.ToInt32(dt.Rows[0]["RequestId"]);

                    // =================================================================
                    // 🤖 BOT TRIGGER (FIXED)
                    // =================================================================
                    try 
                    {
                        var botParams = new[] {
                            new SqlParameter("@RequestID", newRequestId),
                            new SqlParameter("@MaxDistance", 40.0m), // 40km Radius
                            
                            // 👇 THIS WAS MISSING! The SQL needs this output parameter.
                            new SqlParameter("@Message", "") { Direction = ParameterDirection.Output, Size = 255 }
                        };

                        await _db.ExecuteAsync("dbo.sp_AutoGenerateOffersForRequest", botParams, CommandType.StoredProcedure);
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine("Auto-Offer Error: " + ex.Message);
                    }
                    // =================================================================

                    return Ok(new { message = "Το αίτημα καταχωρήθηκε επιτυχώς!", requestId = newRequestId });
                }
                return BadRequest(new { message = "Failed to create request." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Server Error: " + ex.Message });
            }
        }
        [HttpGet("passenger/offers/{requestId}")]
        public async Task<IActionResult> GetOffersForRequest(int requestId)
        {
            var dt = await _db.LoadDataAsync("dbo.sp_GetOffersForRequest", new[] { new SqlParameter("@RequestId", requestId) }, CommandType.StoredProcedure);
            return Ok(ConvertDataTableToDict(dt));
        }

        [HttpGet("passenger/history/{username}")]
        public async Task<IActionResult> GetPassengerHistory(string username)
        {
            var dt = await _db.LoadDataAsync("dbo.sp_GetPassengerHistory", new[] { new SqlParameter("@Username", username) }, CommandType.StoredProcedure);
            return Ok(ConvertDataTableToDict(dt));
        }

        [HttpPost("passenger/accept-offer")]
        public async Task<IActionResult> AcceptOffer([FromBody] JsonObject data)
        {
            var parameters = new SqlParameter[] { 
                new SqlParameter("@OfferId", int.Parse(data["offerId"]!.ToString())), 
                new SqlParameter("@RequestId", int.Parse(data["requestId"]!.ToString())) 
            };
            await _db.ExecuteAsync("dbo.sp_AcceptOffer", parameters, CommandType.StoredProcedure);
            return Ok(new { message = "Η διαδρομή ξεκίνησε! Καλό ταξίδι." });
        }

        // ==========================================
        // 4. DRIVER FEATURES
        // ==========================================
        [HttpGet("driver/open-requests")]
        public async Task<IActionResult> GetOpenRequests()
        {
            var dt = await _db.LoadDataAsync("dbo.sp_GetOpenRequests", null, CommandType.StoredProcedure);
            return Ok(ConvertDataTableToDict(dt));
        }

        [HttpGet("driver/availability/{username}")]
        public async Task<IActionResult> GetDriverAvailability(string username)
        {
            var dt = await _db.LoadDataAsync("dbo.sp_GetDriverAvailability", new[] { new SqlParameter("@Username", username) }, CommandType.StoredProcedure);
            return Ok(ConvertDataTableToDict(dt));
        }

        [HttpPost("driver/submit-offer")]
        public async Task<IActionResult> SubmitOffer([FromBody] JsonObject offerData)
        {
            var parameters = new SqlParameter[] {
                new SqlParameter("@RequestId", int.Parse(offerData["requestId"]!.ToString())),
                new SqlParameter("@DriverId", int.Parse(offerData["driverId"]!.ToString())),
                new SqlParameter("@VehicleId", int.Parse(offerData["vehicleId"]!.ToString())),
                new SqlParameter("@EstimatedCost", decimal.Parse(offerData["estimatedCost"]!.ToString())),
                new SqlParameter("@DistanceToPickup", (decimal)(1.0 + new Random().NextDouble() * 5.0))
            };

            var dt = await _db.LoadDataAsync("dbo.sp_SubmitOffer", parameters, CommandType.StoredProcedure);
            if ((int)dt.Rows[0]["Success"] == 1) return Ok(new { message = dt.Rows[0]["Message"].ToString() });
            return BadRequest(new { message = dt.Rows[0]["Message"].ToString() });
        }

        [HttpPost("driver/upload-document")]
        public async Task<IActionResult> UploadDocument([FromBody] JsonObject docData)
        {
            try 
            {
                var parameters = new[] {
                    new SqlParameter("@Username", docData["username"]?.ToString()),
                    new SqlParameter("@DocType", docData["docType"]?.ToString()),
                    new SqlParameter("@DocNumber", docData["docNumber"]?.ToString()),
                    new SqlParameter("@FileUrl", docData["fileUrl"]?.ToString()),
                    new SqlParameter("@IssueDate", DateTime.Parse(docData["issueDate"]?.ToString())),
                    new SqlParameter("@ExpiryDate", DateTime.Parse(docData["expiryDate"]?.ToString()))
                };

                var dt = await _db.LoadDataAsync("dbo.sp_DriverUploadDocument", parameters, CommandType.StoredProcedure);
                if (dt.Rows.Count > 0 && (int)dt.Rows[0]["Success"] == 1) return Ok(new { message = "Το έγγραφο υποβλήθηκε επιτυχώς!" });
                return BadRequest(new { message = "Σφάλμα: Ο οδηγός δεν βρέθηκε." });
            }
            catch (Exception ex) { return StatusCode(500, new { message = "Server Error: " + ex.Message }); }
        }

        [HttpPost("driver/add-availability")]
        public async Task<IActionResult> AddAvailability([FromBody] JsonObject data)
        {
            try
            {
                var parameters = new[] {
                    new SqlParameter("@Username", data["username"]?.ToString()),
                    new SqlParameter("@Weekday", int.Parse(data["weekday"]?.ToString() ?? "1")),
                    new SqlParameter("@StartTime", TimeSpan.Parse(data["start"]?.ToString() ?? "09:00")),
                    new SqlParameter("@EndTime", TimeSpan.Parse(data["end"]?.ToString() ?? "17:00")),
                    new SqlParameter("@Notes", "Web App")
                };
                
                var dt = await _db.LoadDataAsync("dbo.sp_AddDriverAvailability", parameters, CommandType.StoredProcedure);
                
                if (dt.Rows.Count > 0 && (int)dt.Rows[0]["Success"] == 1) 
                    return Ok(new { message = "Shift added!" });
                
                return BadRequest(new { message = "Error adding shift." });
            }
            catch (Exception ex) { return StatusCode(500, new { message = ex.Message }); }
        }

        [HttpGet("driver/active-trip/{username}")]
        public async Task<IActionResult> GetActiveTrip(string username)
        {
            var dt = await _db.LoadDataAsync("dbo.sp_GetDriverActiveTrip", 
                new[] { new SqlParameter("@Username", username) }, 
                CommandType.StoredProcedure);
            return Ok(ConvertDataTableToDict(dt));
        }

        [HttpPost("driver/update-trip")]
        public async Task<IActionResult> UpdateTrip([FromBody] JsonObject data)
        {
            await _db.ExecuteAsync("dbo.sp_UpdateTripStatus", 
                new[] { 
                    new SqlParameter("@TripId", int.Parse(data["tripId"]?.ToString())), 
                    new SqlParameter("@NewStatus", data["status"]?.ToString()) 
                }, 
                CommandType.StoredProcedure);
            
            return Ok(new { message = "Trip updated!" });
        }

        [HttpPost("feedback/submit")]
        public async Task<IActionResult> SubmitFeedback([FromBody] JsonObject data)
        {
            try
            {
                var parameters = new[] {
                    new SqlParameter("@TripId", int.Parse(data["tripId"]?.ToString())),
                    new SqlParameter("@ReviewerUsername", data["username"]?.ToString()),
                    new SqlParameter("@Rating", int.Parse(data["rating"]?.ToString())),
                    new SqlParameter("@Comment", data["comment"]?.ToString() ?? "")
                };

                await _db.ExecuteAsync("dbo.sp_SubmitFeedback", parameters, CommandType.StoredProcedure);
                return Ok(new { message = "Rating submitted successfully!" });
            }
            catch (Exception ex) { return StatusCode(500, new { message = "Error: " + ex.Message }); }
        }

        // ==========================================
        // 5. OPERATOR FEATURES
        // ==========================================
        [HttpGet("operator/pending-documents")]
        public async Task<IActionResult> GetPendingDocuments()
        {
            var dt = await _db.LoadDataAsync("dbo.sp_GetPendingDocuments", null, CommandType.StoredProcedure);
            return Ok(ConvertDataTableToDict(dt));
        }

        [HttpPost("operator/verify-document")] 
        public async Task<IActionResult> VerifyDocument([FromBody] JsonObject verifyData)
        {
            try
            {
                var parameters = new[] {
                    new SqlParameter("@DocId", int.Parse(verifyData["docId"]?.ToString())),
                    new SqlParameter("@Status", verifyData["status"]?.ToString())
                };
                await _db.ExecuteAsync("dbo.sp_VerifyDocument", parameters, CommandType.StoredProcedure);
                return Ok(new { message = "Document status updated successfully." });
            }
            catch (Exception ex) { return StatusCode(500, new { message = "Error: " + ex.Message }); }
        }

        // ==========================================
        // HELPERS
        // ==========================================
        private List<Dictionary<string, object?>> ConvertDataTableToDict(DataTable dt)
        {
            var columns = dt.Columns.Cast<DataColumn>();
            return dt.AsEnumerable().Select(dataRow => 
                columns.ToDictionary(
                    column => column.ColumnName, 
                    column => 
                    {
                        var value = dataRow[column];
                        if (value is DBNull) return null;
                        if (value is DateTime dtValue) return dtValue.ToString("yyyy-MM-dd HH:mm:ss"); 
                        return value;
                    }
                )
            ).ToList();
        }
    }
}