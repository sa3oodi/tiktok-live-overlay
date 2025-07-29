# PowerShell script to setup auto-start for TikTok Live Overlay
# Run this as Administrator

param(
    [switch]$Install,
    [switch]$Remove
)

$TaskName = "TikTokLiveOverlay"
$ScriptPath = "c:\Users\sa3oo\Desktop\projects\TikTok Live"
$NodePath = (Get-Command node).Source
$LogFile = "$ScriptPath\overlay-service.log"

if ($Install) {
    Write-Host "🚀 Installing TikTok Live Overlay Auto-Start..." -ForegroundColor Green
    
    # Create the task action
    $Action = New-ScheduledTaskAction -Execute $NodePath -Argument "server.js" -WorkingDirectory $ScriptPath
    
    # Create the trigger (at startup)
    $Trigger = New-ScheduledTaskTrigger -AtStartup
    
    # Create settings
    $Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
    
    # Create principal (run as current user)
    $Principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest
    
    # Register the task
    try {
        Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Principal $Principal -Force
        Write-Host "✅ Task '$TaskName' created successfully!" -ForegroundColor Green
        Write-Host "🎯 Server will start automatically when Windows boots" -ForegroundColor Cyan
        Write-Host "📍 Server URL: http://localhost:8081" -ForegroundColor Yellow
    }
    catch {
        Write-Host "❌ Error creating task: $($_.Exception.Message)" -ForegroundColor Red
    }
}
elseif ($Remove) {
    Write-Host "🗑️ Removing TikTok Live Overlay Auto-Start..." -ForegroundColor Yellow
    
    try {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-Host "✅ Task '$TaskName' removed successfully!" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Error removing task: $($_.Exception.Message)" -ForegroundColor Red
    }
}
else {
    Write-Host @"
🎯 TikTok Live Overlay Auto-Start Setup

Usage:
  Install: .\setup-autostart.ps1 -Install
  Remove:  .\setup-autostart.ps1 -Remove

Current Status:
"@ -ForegroundColor Cyan

    $Task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($Task) {
        Write-Host "✅ Auto-start is ENABLED" -ForegroundColor Green
        Write-Host "   Status: $($Task.State)" -ForegroundColor Yellow
        Write-Host "   Last Run: $($Task.LastRunTime)" -ForegroundColor Gray
    } else {
        Write-Host "❌ Auto-start is DISABLED" -ForegroundColor Red
    }
}

Write-Host "`n📖 Instructions:" -ForegroundColor White
Write-Host "1. Right-click PowerShell → Run as Administrator" -ForegroundColor Gray  
Write-Host "2. Run: .\setup-autostart.ps1 -Install" -ForegroundColor Gray
Write-Host "3. Restart your computer to test" -ForegroundColor Gray
