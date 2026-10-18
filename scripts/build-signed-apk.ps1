# Daymark: signed Android APK, built locally. No upload, release or deployment.
# Run from any directory after verifying the Git branch you wish to distribute.
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$')]
    [string]$VersionName,

    [Parameter(Mandatory = $true)]
    [ValidateRange(1, 2100000000)]
    [int]$VersionCode,

    [Parameter(Mandatory = $true)]
    [string]$KeystorePath,

    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[A-Za-z0-9._-]+$')]
    [string]$KeyAlias
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$resolvedKeystore = (Resolve-Path -LiteralPath $KeystorePath -ErrorAction Stop).Path
$artifactDir = Join-Path $root 'release-artifacts'
$apk = Join-Path $root 'android/app/build/outputs/apk/release/app-release.apk'

function Run-Step {
    param([string]$Program, [string[]]$Arguments)
    & $Program @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Program failed with exit code $LASTEXITCODE"
    }
}

function Read-SecretPlaintext {
    param([string]$Prompt)
    $secure = Read-Host -Prompt $Prompt -AsSecureString
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
}

# Keep signing secrets away from npm installation scripts and Vite build steps.
Write-Host '1/5: Install dependencies, test and build the web bundle...'
Push-Location $root
try {
    Run-Step 'npm.cmd' @('ci')
    Run-Step 'npm.cmd' @('test')
    Run-Step 'npm.cmd' @('run', 'build')
    Run-Step 'npx.cmd' @('cap', 'sync', 'android')

    # Validate the Android SDK signer before asking for secret credentials.
    $sdkCandidates = @($env:ANDROID_HOME, $env:ANDROID_SDK_ROOT,
        (Join-Path $env:LOCALAPPDATA 'Android\Sdk')) |
        Where-Object { $_ -and (Test-Path -LiteralPath $_) } |
        Select-Object -Unique
    $apksigner = $null
    foreach ($sdk in $sdkCandidates) {
        $buildTools = Join-Path $sdk 'build-tools'
        if (-not (Test-Path -LiteralPath $buildTools)) { continue }
        $candidate = Get-ChildItem $buildTools -Directory |
            Sort-Object Name -Descending |
            ForEach-Object { Join-Path $_.FullName 'apksigner.bat' } |
            Where-Object { Test-Path -LiteralPath $_ } |
            Select-Object -First 1
        if ($candidate) { $apksigner = $candidate; break }
    }
    if (-not $apksigner) {
        throw 'Android SDK apksigner.bat not found. Install Android SDK Build-Tools from Android Studio.'
    }

    Write-Host '2/5: Prepare private signing credentials (not echoed or committed)...'
    $env:DAYMARK_RELEASE_KEYSTORE = $resolvedKeystore
    $env:DAYMARK_RELEASE_KEY_ALIAS = $KeyAlias
    $env:DAYMARK_VERSION_NAME = $VersionName
    $env:DAYMARK_VERSION_CODE = [string]$VersionCode

    # PowerShell does not persist these inputs to disk. They exist in this
    # process and its temporary Gradle child process for signing only.
    $env:DAYMARK_RELEASE_STORE_PASSWORD = Read-SecretPlaintext 'Keystore password'
    $env:DAYMARK_RELEASE_KEY_PASSWORD = Read-SecretPlaintext 'Key password (often same for PKCS12)'

    Write-Host '3/5: Build signed release APK...'
    Push-Location (Join-Path $root 'android')
    try {
        Run-Step '.\gradlew.bat' @('--no-daemon', ':app:assembleRelease')
    } finally { Pop-Location }

    if (-not (Test-Path -LiteralPath $apk)) {
        throw 'Gradle did not produce app-release.apk. Do not distribute an unsigned APK.'
    }

    Write-Host '4/5: Verify APK signature...'
    Run-Step $apksigner @('verify', '--verbose', '--print-certs', $apk)

    Write-Host '5/5: Copy final file and calculate SHA-256...'
    New-Item -ItemType Directory -Force -Path $artifactDir | Out-Null
    $filename = 'daymark-v' + $VersionName + '-android.apk'
    $final = Join-Path $artifactDir $filename
    Copy-Item -LiteralPath $apk -Destination $final -Force
    $hash = (Get-FileHash -LiteralPath $final -Algorithm SHA256).Hash.ToLowerInvariant()
    $checksumFile = Join-Path $artifactDir ('daymark-v' + $VersionName + '-SHA256.txt')
    Set-Content -LiteralPath $checksumFile -Value ("$hash  $filename") -Encoding Ascii

    Write-Host ''
    Write-Host 'SIGNED RELEASE BUILD VERIFIED' -ForegroundColor Green
    Write-Host "APK: $final"
    Write-Host "SHA-256: $hash"
    Write-Host "Checksum file: $checksumFile"
    Write-Host 'No GitHub Release was created and nothing was uploaded.'
}
finally {
    # Environment signing secrets cannot be recovered from Git history because
    # they were never placed in a tracked file.
    Remove-Item Env:DAYMARK_RELEASE_KEYSTORE -ErrorAction SilentlyContinue
    Remove-Item Env:DAYMARK_RELEASE_STORE_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:DAYMARK_RELEASE_KEY_ALIAS -ErrorAction SilentlyContinue
    Remove-Item Env:DAYMARK_RELEASE_KEY_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:DAYMARK_VERSION_NAME -ErrorAction SilentlyContinue
    Remove-Item Env:DAYMARK_VERSION_CODE -ErrorAction SilentlyContinue
    Pop-Location
}
