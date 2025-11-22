using System.Data;
using System.Data.SqlClient;
using Microsoft.Extensions.Configuration;

namespace OSRH.Api.Data
{
    public class SqlDataAccess
    {
        private readonly IConfiguration _configuration;

        public SqlDataAccess(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        private string GetConnectionString()
        {
            return _configuration.GetConnectionString("DefaultConnection")!;
        }

        // Μέθοδος για ανάγνωση δεδομένων (SELECT, EXEC sp_Get...)
        public async Task<DataTable> LoadDataAsync(string sql, SqlParameter[]? parameters = null, CommandType commandType = CommandType.Text)
        {
            using (SqlConnection connection = new SqlConnection(GetConnectionString()))
            {
                await connection.OpenAsync();
                using (SqlCommand command = new SqlCommand(sql, connection))
                {
                    command.CommandType = commandType;
                    if (parameters != null)
                    {
                        command.Parameters.AddRange(parameters);
                    }

                    DataTable dt = new DataTable();
                    using (SqlDataAdapter adapter = new SqlDataAdapter(command))
                    {
                        adapter.Fill(dt);
                    }
                    return dt;
                }
            }
        }

        // Μέθοδος για εγγραφή δεδομένων (INSERT, UPDATE, EXEC sp_ExecuteRightToBeForgotten)
        public async Task ExecuteAsync(string sql, SqlParameter[]? parameters = null, CommandType commandType = CommandType.Text)
        {
            using (SqlConnection connection = new SqlConnection(GetConnectionString()))
            {
                await connection.OpenAsync();
                using (SqlCommand command = new SqlCommand(sql, connection))
                {
                    command.CommandType = commandType;
                    if (parameters != null)
                    {
                        command.Parameters.AddRange(parameters);
                    }
                    await command.ExecuteNonQueryAsync();
                }
            }
        }
    }
}