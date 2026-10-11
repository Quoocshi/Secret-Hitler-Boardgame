$ErrorActionPreference = 'Stop'
$backendPath = Split-Path $PSScriptRoot -Parent
$repoPath = Split-Path $backendPath -Parent
$portableJava = Join-Path $repoPath '.tools/jdk-21.0.12.1+1'
if (Test-Path -LiteralPath $portableJava) { $env:JAVA_HOME = $portableJava }
if (-not $env:JAVA_HOME) { throw 'Set JAVA_HOME to a JDK 21 installation.' }
$env:DEBUG = 'false'
Set-Location -LiteralPath $backendPath
& .\mvnw.cmd -q test-compile dependency:build-classpath '-Dmdep.outputFile=target/test-classpath.txt'
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$classPath = (Join-Path $backendPath 'target/test-classes') + ';' + (Join-Path $backendPath 'target/classes') + ';' + ([IO.File]::ReadAllText((Join-Path $backendPath 'target/test-classpath.txt')).Trim())
& (Join-Path $env:JAVA_HOME 'bin/java.exe') '-Dfile.encoding=UTF-8' '-cp' $classPath 'com.example.backend.support.FixtureServerApplication'
exit $LASTEXITCODE
