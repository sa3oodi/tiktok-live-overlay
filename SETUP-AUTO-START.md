# TikTok Live Overlay - Auto-Start Task Scheduler Setup

## Quick Setup via PowerShell (Run as Administrator):

```powershell
# Create Task Scheduler entry
$Action = New-ScheduledTaskAction -Execute "node" -Argument "server.js" -WorkingDirectory "c:\Users\sa3oo\Desktop\projects\TikTok Live"
$Trigger = New-ScheduledTaskTrigger -AtStartup
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
$Principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive
Register-ScheduledTask -TaskName "TikTok Live Overlay" -Action $Action -Trigger $Trigger -Settings $Settings -Principal $Principal
```

## Manual Task Scheduler Setup:

1. Press `Win + R` → type `taskschd.msc` → Enter
2. Click **"Create Basic Task"**
3. **Name**: `TikTok Live Overlay`
4. **Trigger**: `When the computer starts`
5. **Action**: `Start a program`
6. **Program**: `node`
7. **Arguments**: `server.js`
8. **Start in**: `c:\Users\sa3oo\Desktop\projects\TikTok Live`
9. Check **"Run whether user is logged on or not"**
10. **Finish**

This method is most reliable and runs even if you're not logged in!
