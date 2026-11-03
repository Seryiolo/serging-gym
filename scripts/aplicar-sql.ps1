<#
  Aplica un archivo .sql a la base de datos Turso.
  Uso:  ./scripts/aplicar-sql.ps1 db/schema.sql
  Lee TURSO_DATABASE_URL y TURSO_AUTH_TOKEN del entorno (nunca van en el repo).
  Cada sentencia se ejecuta por separado; se detiene en el primer error.
#>
param([Parameter(Mandatory = $true)][string]$Archivo)

$url = [Environment]::GetEnvironmentVariable('TURSO_DATABASE_URL', 'User')
$tok = [Environment]::GetEnvironmentVariable('TURSO_AUTH_TOKEN', 'User')
if (-not $url -or -not $tok) { throw 'Faltan TURSO_DATABASE_URL / TURSO_AUTH_TOKEN' }

$sql = (Get-Content -Raw -Encoding UTF8 $Archivo) -replace '(?m)^\s*--.*$', ''
$sentencias = $sql -split ';\s*(?:\r?\n|$)' | ForEach-Object { $_.Trim() } | Where-Object { $_ }

$n = 0
foreach ($s in $sentencias) {
  $body = @{ requests = @(@{ type = 'execute'; stmt = @{ sql = $s } }, @{ type = 'close' }) } | ConvertTo-Json -Depth 6
  $r = Invoke-RestMethod -Method Post "$url/v2/pipeline" -Headers @{ Authorization = "Bearer $tok" } -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($body))
  if ($r.results[0].type -ne 'ok') {
    throw ("Error en la sentencia #$($n + 1): " + ($r.results[0].error.message) + "`n" + $s)
  }
  $n++
}
"OK: $n sentencias aplicadas desde $Archivo"
