param([int]$Port = 18081)
$ErrorActionPreference = 'Stop'
$frontendPath = Split-Path $PSScriptRoot -Parent
$repositoryPath = Split-Path $frontendPath -Parent
$backendPath = Join-Path $repositoryPath 'Backend'

if (Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue) {
    throw "Test backend port $Port is already occupied; refusing to reuse another service."
}

$safeDirectoryOption = "safe.directory=$($repositoryPath.Replace('\','/'))"
$backendDiff = git -c $safeDirectoryOption -C $repositoryPath diff 3e50528 -- Backend
if ($LASTEXITCODE -ne 0 -or $backendDiff) {
    throw 'Backend differs from the approved baseline.'
}

$portableJdk = Join-Path $repositoryPath '.tools/jdk-21.0.12.1+1'
if (Test-Path -LiteralPath $portableJdk) {
    $env:JAVA_HOME = $portableJdk
}
if (!$env:JAVA_HOME) {
    throw 'Set JAVA_HOME to JDK 21 before running legacy backend tests.'
}
$javaPath = Join-Path $env:JAVA_HOME 'bin/java.exe'
$env:DEBUG = 'false'

Push-Location $backendPath
try {
    # Clean prevents stale classes from the reverted backend entering the production JAR.
    & .\mvnw.cmd -B -ntp clean package -DskipTests
    if ($LASTEXITCODE -ne 0) {
        throw 'The unchanged backend could not be packaged.'
    }
} finally {
    Pop-Location
}

$testOutputPath = Join-Path $frontendPath 'test-results'
New-Item -ItemType Directory -Path $testOutputPath -Force | Out-Null
$jarPath = Join-Path $backendPath 'target/Backend-0.0.1-SNAPSHOT.jar'
$serverStartOptions = @{
    FilePath = $javaPath
    ArgumentList = @(
        '-Dfile.encoding=UTF-8'
        '-Dserver.address=127.0.0.1'
        "-Dserver.port=$Port"
        '-jar'
        "`"$jarPath`""
    )
    WindowStyle = 'Hidden'
    PassThru = $true
    RedirectStandardOutput = Join-Path $testOutputPath 'legacy-backend.log'
    RedirectStandardError = Join-Path $testOutputPath 'legacy-backend-error.log'
}
$serverProcess = Start-Process @serverStartOptions

try {
    while (!$serverProcess.HasExited) {
        Start-Sleep -Milliseconds 500
    }
    if ($serverProcess.ExitCode -ne 0) {
        throw "Backend exited with code $($serverProcess.ExitCode)."
    }
} finally {
    $processQuery = @{
        ClassName = 'Win32_Process'
        Filter = "ProcessId = $($serverProcess.Id)"
        ErrorAction = 'SilentlyContinue'
    }
    $ownedProcess = Get-CimInstance @processQuery
    if ($ownedProcess -and $ownedProcess.CommandLine.Contains($jarPath)) {
        [System.Diagnostics.Process]::GetProcessById($serverProcess.Id).Kill()
    }
}
