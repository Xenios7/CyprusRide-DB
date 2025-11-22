using OSRH.Api.Data;
using OSRH.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// 1. Προσθήκη υπηρεσιών (Services)
builder.Services.AddControllers();
builder.Services.AddScoped<SqlDataAccess>();
builder.Services.AddScoped<ReportService>();

var app = builder.Build();

// 2. Ρύθμιση του HTTP pipeline (Η σειρά έχει σημασία!)

// app.UseHttpsRedirection(); // Μπορείτε να το σχολιάσετε αν έχετε θέματα με το HTTPS στο localhost

// --- ΟΙ ΚΡΙΣΙΜΕΣ ΕΝΤΟΛΕΣ ΓΙΑ ΤΟ HTML ---
app.UseDefaultFiles(); // <--- ΑΥΤΟ ΛΕΙΠΕΙ ή είναι σε λάθος σειρά. Πρέπει να είναι ΠΡΙΝ το StaticFiles.
app.UseStaticFiles();  // Επιτρέπει την πρόσβαση στο φάκελο wwwroot
// ----------------------------------------

app.MapControllers();

app.Run();