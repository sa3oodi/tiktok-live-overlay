# TikTok Live Overlay - Compact Analytics for OBS

## 🎯 Quick Start

### Option 1: Manual Start
1. Double-click `start-server.bat`
2. Server will run at: http://localhost:8081

### Option 2: Auto-Start on Boot
1. Right-click `auto-start.bat` → "Create shortcut"
2. Press `Win + R`, type `shell:startup`, press Enter
3. Move the shortcut to the Startup folder
4. Restart your computer - server will start automatically!

## 📺 OBS Studio Setup

### Step 1: Generate Overlay URL
1. Open http://localhost:8081
2. Enter TikTok username 
3. Click "Generate URL"
4. Copy the generated URL

### Step 2: Add to OBS
1. **Add Browser Source** in OBS
2. **Paste the URL** from step 1
3. **Set dimensions**: Width: 380px, Height: 480px
4. **Check**: "Shutdown source when not visible"
5. **Check**: "Refresh browser when scene becomes active"
6. **Background**: Transparent ✅

### Direct URL Format:
```
http://localhost:8081/overlay?username=TIKTOK_USERNAME
```

## 🎨 What You Get

✅ **Compact Design**: 380x480px perfect for overlay  
✅ **Real-time Stats**: Viewers, Likes, Diamonds  
✅ **Live Chat**: All messages in real-time  
✅ **Gift Notifications**: Beautiful gift displays  
✅ **Auto-Connect**: Set username once, connects automatically  
✅ **Transparent Background**: Perfect for streaming  
✅ **Professional Look**: TikTok-themed colors and animations  

## 🔧 Features

- **Auto-Reconnect**: Reconnects if stream restarts
- **Smart Filtering**: Shows important events first
- **Compact Layout**: Fits anywhere on your stream
- **No Lag**: Optimized for OBS performance
- **Always On**: Runs in background, starts with Windows

## 🚀 Usage

1. **Start Server**: Run `start-server.bat`
2. **Generate URL**: Visit http://localhost:8081
3. **Add to OBS**: Use Browser Source with generated URL
4. **Go Live**: Overlay shows real-time TikTok analytics!

## 🎯 Pro Tips

1. **Position the overlay** in a corner of your stream
2. **Test with a live user** before going live yourself
3. **Keep server running** during your entire stream
4. **Use auto-start** so you never forget to launch it
5. **Bookmark** http://localhost:8081 for quick access

## � Auto-Restart

To make the server super reliable:
1. Use the auto-start method (starts with Windows)
2. Server auto-reconnects if TikTok connection drops
3. Overlay refreshes automatically when stream restarts

## 🌐 Network Access

To use from another computer on your network:
- Find your IP address: `ipconfig`
- Use: `http://YOUR_IP:8081/overlay?username=USERNAME`

---

🎉 **Perfect for streamers who want clean, professional TikTok Live analytics without the clutter!**
