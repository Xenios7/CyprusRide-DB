using OSRH.Api.Data;
using OSRH.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors();
builder.Services.AddControllers();
builder.Services.AddScoped<SqlDataAccess>();
builder.Services.AddScoped<ReportService>();

var app = builder.Build();

app.UseCors(policy => policy
    .AllowAnyOrigin()
    .AllowAnyMethod()
    .AllowAnyHeader());

app.UseDefaultFiles();
app.UseStaticFiles();
app.MapControllers();

app.Run();