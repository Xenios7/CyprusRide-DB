using OSRH.Api.Data;
using OSRH.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// 1. Προσθήκη υπηρεσιών στο container
builder.Services.AddControllers();

// Συνδέουμε τις κλάσεις μας ώστε να μπορούν να χρησιμοποιηθούν (Dependency Injection)
builder.Services.AddScoped<SqlDataAccess>();
builder.Services.AddScoped<ReportService>();

var app = builder.Build();

// 2. Ρύθμιση του HTTP request pipeline
app.UseHttpsRedirection();

// Επιτρέπουμε στο index.html να καλείται (Static Files)
app.UseDefaultFiles(); // Ψάχνει για index.html
app.UseStaticFiles();  // Επιτρέπει πρόσβαση στο φάκελο wwwroot

app.MapControllers(); // Ενεργοποιεί τα API endpoints

app.Run();