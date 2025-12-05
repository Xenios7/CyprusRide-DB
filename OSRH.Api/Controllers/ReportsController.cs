using Microsoft.AspNetCore.Mvc;
using OSRH.Api.Services;

namespace OSRH.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")] 
    public class ReportsController : ControllerBase
    {
        private readonly ReportService _reportService;

        public ReportsController(ReportService reportService)
        {
            _reportService = reportService;
        }

        [HttpGet("cost-analysis")]
        public async Task<IActionResult> GetCostAnalysis()
        {
            try
            {
                var data = await _reportService.GetCostAnalysisAsync();
                return Ok(data); // Επιστρέφει 200 OK και το JSON
            }
            catch (Exception ex)
            {
                // Σε πραγματική εφαρμογή θα καταγράφαμε το λάθος
                return StatusCode(500, "Internal Server Error: " + ex.Message);
            }
        }
    }
}