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
        [HttpGet("reports/cost")]
        public async Task<IActionResult> GetCostReport()
        {
            var dt = await _db.LoadDataAsync("dbo.sp_GetCostAnalysisReport", null, CommandType.StoredProcedure);
            return Ok(ConvertDataTableToDict(dt));
        }

        [HttpGet("reports/driver-performance")]
        public async Task<IActionResult> GetDriverPerformance()
        {
            var dt = await _db.LoadDataAsync("dbo.sp_GetDriverPerformance", null, CommandType.StoredProcedure);
            return Ok(ConvertDataTableToDict(dt));
        }

        [HttpGet("admin/service-types")]
[HttpGet("admin/service-types")]
public async Task<IActionResult> GetOperatorServiceTypes()
{
    var dt = await _db.LoadDataAsync(
        "dbo.sp_GetServiceTypes",
        null,
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

        // Get GDPR requests.
        [HttpGet("admin/gdpr-requests")]
        public async Task<IActionResult> GetGdprRequests()
        {
            var dt = await _db.LoadDataAsync(
                "dbo.sp_GetGdprRequests",
                null,
                CommandType.StoredProcedure
            );

            return Ok(ConvertDataTableToDict(dt));
        }
 
        //  Approve GDPR requests.
        [HttpPost("admin/gdpr-approve")]
        public async Task<IActionResult> ApproveGdprRequest([FromBody] JsonObject data)
        {
            int logId = int.Parse(data["logId"]!.ToString());

            await _db.ExecuteAsync(
                "dbo.sp_ApproveGdprRequest",
                new[] { new SqlParameter("@LogId", logId) },
                CommandType.StoredProcedure
            );

            return Ok(new { message = "GDPR request approved." });
        }

        //  Reject GDPR requests.
        [HttpPost("admin/gdpr-reject")]
        public async Task<IActionResult> RejectGdprRequest([FromBody] JsonObject data)
        {
            int logId = int.Parse(data["logId"]!.ToString());

            await _db.ExecuteAsync(
                "dbo.sp_RejectGdprRequest",
                new[] { new SqlParameter("@LogId", logId) },
                CommandType.StoredProcedure
            );

            return Ok(new { message = "GDPR request rejected." });
        }

        [HttpGet("admin/users-with-roles")]
        public async Task<IActionResult> GetUsersWithRoles()
        {
            var dt = await _db.LoadDataAsync(
                "dbo.sp_AdminGetUsersWithRoles",
                null,
                CommandType.StoredProcedure
            );

            return Ok(ConvertDataTableToDict(dt));
        }

        [HttpGet("admin/roles")]
        public async Task<IActionResult> GetAllRoles()
        {
            var dt = await _db.LoadDataAsync(
                "dbo.sp_AdminGetAllRoles",
                null,
                CommandType.StoredProcedure
            );

            return Ok(ConvertDataTableToDict(dt));
        }

        [HttpPost("admin/assign-role")]
        public async Task<IActionResult> AssignRole([FromBody] JsonObject data)
        {
            int userId = int.Parse(data["userId"]!.ToString());
            int roleId = int.Parse(data["roleId"]!.ToString());

            await _db.ExecuteAsync(
                "dbo.sp_AdminAssignRole",
                new[]
                {
                    new SqlParameter("@UserId", userId),
                    new SqlParameter("@RoleId", roleId)
                },
                CommandType.StoredProcedure
            );

            return Ok(new { message = "Role assigned successfully" });
        }

        // ==========================================
        // 3. PASSENGER FEATURES
        // ==========================================
        [HttpPost("passenger/request")]
        public async Task<IActionResult> CreateRequest([FromBody] JsonObject reqData)
        {
            // Hardcoded coords for demo
            var parameters = new SqlParameter[] {
                new SqlParameter("@Username", reqData["username"]!.ToString()),
                new SqlParameter("@ServiceId", int.Parse(reqData["serviceId"]!.ToString())),
                new SqlParameter("@EstimatedFare", 15.50m),
                new SqlParameter("@PickupLat", 35.1700m),
                new SqlParameter("@PickupLon", 33.3600m),
                new SqlParameter("@DropoffLat", 34.9200m),
                new SqlParameter("@DropoffLon", 33.6300m),
                new SqlParameter("@Notes", reqData["notes"]?.ToString() ?? "")
            };

            DataTable dt = await _db.LoadDataAsync("dbo.sp_CreateTransportRequest", parameters, CommandType.StoredProcedure);
            
            if (dt.Rows.Count > 0 && dt.Columns.Contains("RequestId"))
            {
                return Ok(new { message = "Το αίτημα καταχωρήθηκε επιτυχώς!", requestId = Convert.ToInt32(dt.Rows[0]["RequestId"]) });
            }
            return BadRequest(new { message = "Failed to create request." });
        }

        [HttpGet("passenger/history/{username}")]
        public async Task<IActionResult> GetPassengerHistory(string username)
        {
            var dt = await _db.LoadDataAsync("dbo.sp_GetPassengerHistory", new[] { new SqlParameter("@Username", username) }, CommandType.StoredProcedure);
            return Ok(ConvertDataTableToDict(dt));
        }

        [HttpGet("passenger/offers/{requestId}")]
        public async Task<IActionResult> GetOffers(int requestId)
        {
            var dt = await _db.LoadDataAsync("dbo.sp_GetOffersForRequest", new[] { new SqlParameter("@RequestId", requestId) }, CommandType.StoredProcedure);
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

        // Passenger credits.

        [HttpGet("passenger/credits/{username}")]
        public async Task<IActionResult> GetPassengerCredits(string username)
        {

            var dt = await _db.LoadDataAsync(
                "dbo.sp_GetPassengerCredits",
                new[] { new SqlParameter("@Username", username) },
                CommandType.StoredProcedure
            );

            return Ok(ConvertDataTableToDict(dt));
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

        // --- NEW DRIVER FEATURES (ADDED AND FIXED) ---

        // 14. DRIVER: Add Availability (WRITE)
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


        // 15. DRIVER: Get Active Trip
        [HttpGet("driver/active-trip/{username}")]
        public async Task<IActionResult> GetActiveTrip(string username)
        {
            var dt = await _db.LoadDataAsync("dbo.sp_GetDriverActiveTrip", 
                new[] { new SqlParameter("@Username", username) }, 
                CommandType.StoredProcedure);
            return Ok(ConvertDataTableToDict(dt));
        }

        // 16. DRIVER: Update Trip Status
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

        // 17. FEEDBACK: Submit Rating
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


        // Driver earnings feature.
        [HttpGet("driver/earnings/{username}")]
        public async Task<IActionResult> GetDriverEarnings(string username)
        {
            var dt = await _db.LoadDataAsync(
                "dbo.sp_GetDriverEarnings",  
                new[] { new SqlParameter("@Username", username) },
                CommandType.StoredProcedure
            );

            return Ok(ConvertDataTableToDict(dt));
        }

        //  Driver GDPR delete account request.
       [HttpPost("driver/gdpr-request")]
        public async Task<IActionResult> CreateGdprRequest([FromBody] JsonObject data)
        {
            string username = data["username"]?.ToString() ?? "";

            await _db.ExecuteAsync(
                "dbo.sp_GDPR_CreateRequest",
                new[] { new SqlParameter("@Username", username) },
                CommandType.StoredProcedure
            );

        return Ok(new { message = "Το αίτημα GDPR στάλθηκε για έγκριση." });
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

        [HttpGet("operator/service-types")]
        public async Task<IActionResult> GetServiceTypes()
        {
            var dt = await _db.LoadDataAsync(
                "dbo.sp_GetServiceTypes",
                null,
                CommandType.StoredProcedure
            );

            return Ok(ConvertDataTableToDict(dt));
        }

        [HttpPost("operator/service-types")]
        public async Task<IActionResult> AddServiceType([FromBody] JsonObject data)
        {
            var parameters = new[]
            {
                new SqlParameter("@Type", data["type"]?.ToString()),
                new SqlParameter("@Description", data["description"]?.ToString() ?? ""),
                new SqlParameter("@BaseFare", decimal.Parse(data["base_fare"]!.ToString())),
                new SqlParameter("@CostPerMinute", decimal.Parse(data["cost_per_minute"]!.ToString())),
                new SqlParameter("@CostPerKm", decimal.Parse(data["cost_per_km"]!.ToString())),
                new SqlParameter("@MinimumFare", decimal.Parse(data["minimum_fare"]!.ToString()))
            };

            var dt = await _db.LoadDataAsync(
                "dbo.sp_AddServiceType",
                parameters,
                CommandType.StoredProcedure
            );

            return Ok(ConvertDataTableToDict(dt));
        }

        [HttpPut("operator/service-types/{id}")]
        public async Task<IActionResult> UpdateServiceType(int id, [FromBody] JsonObject data)
        {
            var parameters = new[]
            {
                new SqlParameter("@Id", id),
                new SqlParameter("@Type", data["type"]?.ToString()),
                new SqlParameter("@Description", data["description"]?.ToString() ?? ""),
                new SqlParameter("@BaseFare", decimal.Parse(data["base_fare"]!.ToString())),
                new SqlParameter("@CostPerMinute", decimal.Parse(data["cost_per_minute"]!.ToString())),
                new SqlParameter("@CostPerKm", decimal.Parse(data["cost_per_km"]!.ToString())),
                new SqlParameter("@MinimumFare", decimal.Parse(data["minimum_fare"]!.ToString()))
            };

            var dt = await _db.LoadDataAsync(
                "dbo.sp_UpdateServiceType",
                parameters,
                CommandType.StoredProcedure
            );

            return Ok(ConvertDataTableToDict(dt));
        }

        [HttpDelete("operator/service-types/{id}")]
        public async Task<IActionResult> DeleteServiceType(int id)
        {
            await _db.ExecuteAsync(
                "dbo.sp_DeleteServiceType",
                new[] { new SqlParameter("@Id", id) },
                CommandType.StoredProcedure
            );

            return Ok(new { message = "Service type deleted successfully" });
        }

        [HttpGet("operator/vehicle-prerequisites/{vehicleId}")]
        public async Task<IActionResult> GetVehiclePrerequisites(int vehicleId)
        {
            var dt = await _db.LoadDataAsync(
            "dbo.sp_GetVehiclePrerequisites",
            new[] { new SqlParameter("@VehicleId", vehicleId) },
            CommandType.StoredProcedure
            );

        return Ok(ConvertDataTableToDict(dt));
        }

        [HttpPost("operator/vehicle-prerequisites")]
        public async Task<IActionResult> AddVehiclePrerequisite([FromBody] JsonObject data)
        {
            var parameters = new[]
            {
                new SqlParameter("@VehicleId", int.Parse(data["vehicle_id"]!.ToString())),
                new SqlParameter("@Description", data["description"]?.ToString() ?? ""),
                new SqlParameter("@Value", data["value"]?.ToString() ?? ""),
                new SqlParameter("@AgeLimit", data["age_limit"] != null ? int.Parse(data["age_limit"]!.ToString()) : (object)DBNull.Value),
                new SqlParameter("@Type", data["type"]?.ToString() ?? "")
            };

            await _db.ExecuteAsync("dbo.sp_AddVehiclePrerequisite", parameters, CommandType.StoredProcedure);

            return Ok(new { message = "Inserted" });
        }

        [HttpPut("operator/vehicle-prerequisites/{id}")]
        public async Task<IActionResult> UpdateVehiclePrerequisite(int id, [FromBody] JsonObject data)
        {
            var parameters = new[]
            {
                new SqlParameter("@Id", id),
                new SqlParameter("@Description", data["description"]?.ToString() ?? ""),
                new SqlParameter("@Value", data["value"]?.ToString() ?? ""),
                new SqlParameter("@AgeLimit", data["age_limit"] != null ? int.Parse(data["age_limit"]!.ToString()) : (object)DBNull.Value),
                new SqlParameter("@Type", data["type"]?.ToString() ?? "")
            };

            await _db.ExecuteAsync("dbo.sp_UpdateVehiclePrerequisite", parameters, CommandType.StoredProcedure);

            return Ok(new { message = "Updated" });
        }

        [HttpDelete("operator/vehicle-prerequisites/{id}")]
        public async Task<IActionResult> DeleteVehiclePrerequisite(int id)
        {
            await _db.ExecuteAsync(
                "dbo.sp_DeleteVehiclePrerequisite",
                new[] { new SqlParameter("@Id", id) },
                CommandType.StoredProcedure
            );

            return Ok(new { message = "Deleted" });
        }

[HttpGet("operator/vehicles")]
public async Task<IActionResult> GetAllVehicles()
{
    var dt = await _db.LoadDataAsync(
        "dbo.sp_GetAllVehicles",
        null,
        CommandType.StoredProcedure
    );

    return Ok(ConvertDataTableToDict(dt));
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
