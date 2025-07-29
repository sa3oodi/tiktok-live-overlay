# 🎯 TikTok Live Overlay

A **compact, professional overlay** for **OBS Studio** that displays real-time TikTok Live analytics including viewer count, likes, diamonds, chat messages, and gifts. Perfect for streamers who want to monitor their TikTok Live engagement without cluttering their stream.

![TikTok Live Overlay Preview](https://img.shields.io/badge/Version-1.0.0-blue) ![Node.js](https://img.shields.io/badge/Node.js-18%2B-green) ![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ Features

- 🎨 **Professional Design**: TikTok-themed colors and smooth animations
- 📊 **Real-time Stats**: Live viewer count, total likes, and diamonds earned
- 💬 **Live Chat**: All chat messages displayed in real-time
- 🎁 **Gift Notifications**: Beautiful gift displays with streak tracking
- 🔄 **Auto-Reconnect**: Automatically reconnects if connection drops
- 🖥️ **OBS Ready**: Optimized 380x480px overlay with transparent background
- ⚡ **Auto-Start**: Can run automatically when Windows starts
- 🌐 **Local Hosting**: No internet dependency, runs on localhost

## 📸 Screenshots

### Overlay in Action
The compact overlay shows all essential information without overwhelming your stream:
- Real-time viewer count, likes, and diamonds at the top
- Live chat messages with usernames and timestamps
- Gift notifications with streak tracking
- Professional TikTok-themed design

### Setup Interface
Simple web interface to generate OBS-ready URLs:
- Enter TikTok username
- Generate overlay URL
- Copy and paste into OBS Browser Source

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (version 14 or higher)
- [OBS Studio](https://obsproject.com/)
- Active TikTok account (for testing)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/tiktok-live-overlay.git
   cd tiktok-live-overlay
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   # or
   node server.js
   # or double-click start-server.bat on Windows
   ```

4. **Open the setup page**
   ```
   http://localhost:8081
   ```

## 📺 OBS Studio Setup

### Method 1: Using the Web Interface
1. Visit `http://localhost:8081`
2. Enter a TikTok username
3. Click "Generate URL"
4. Copy the generated URL

### Method 2: Direct URL
```
http://localhost:8081/overlay?username=TIKTOK_USERNAME
```

### Adding to OBS
1. **Add Browser Source** in OBS Studio
2. **Paste the URL** from above
3. **Set dimensions**: 
   - Width: `380px`
   - Height: `480px`
4. **Enable these settings**:
   - ✅ Shutdown source when not visible
   - ✅ Refresh browser when scene becomes active
   - ✅ Use custom CSS (optional, for positioning)

### Positioning Tips
- Position in corner of your stream layout
- Use CSS transforms for custom positioning:
  ```css
  body { transform: scale(0.8); }  /* Make smaller */
  ```

## ⚙️ Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
# Optional: TikTok session ID for better connectivity
SESSIONID=your_tiktok_session_id

# Optional: Enable rate limiting
ENABLE_RATE_LIMIT=true

# Optional: Custom port (default: 8081)
PORT=8081
```

### Server Options
The server accepts the following options in `server.js`:

- **Port**: Default 8081, configurable via PORT env variable
- **Rate Limiting**: Can be enabled via ENABLE_RATE_LIMIT
- **Session ID**: Optional TikTok session for improved connection

## 🔧 Auto-Start Setup

### Windows Startup (Easiest)
1. Right-click `startup-silent.bat` → Create shortcut
2. Press `Win + R` → type `shell:startup` → Enter
3. Move the shortcut to the Startup folder
4. Restart your PC

### Task Scheduler (Most Reliable)
Run PowerShell as Administrator:
```powershell
cd "path\to\tiktok-live-overlay"
.\setup-autostart.ps1 -Install
```

### Service Installation (Professional)
1. Download [NSSM](https://nssm.cc/download)
2. Place `nssm.exe` in the project folder
3. Run `install-service.bat` as Administrator

## 🎨 Customization

### Overlay Appearance
Edit the CSS in `public/overlay.html` to customize:

```css
:root {
    --tiktok-red: #fe2c55;      /* Primary brand color */
    --tiktok-blue: #25f4ee;     /* Secondary brand color */
    --tiktok-purple: #9b59b6;   /* Accent color */
    --tiktok-orange: #ff8c42;   /* Gift/diamond color */
}
```

### Event Filtering
Modify `public/app-overlay.js` to show/hide specific events:

```javascript
// Hide join messages
connection.on('member', (msg) => {
    // Comment out to hide joins
    // addChatItem('#00d4aa', msg, 'joined', true);
});
```

### Size Adjustments
Change overlay dimensions in `public/overlay.html`:

```css
.overlay-container {
    width: 380px;   /* Adjust width */
    height: 480px;  /* Adjust height */
}
```

## 📁 Project Structure

```
tiktok-live-overlay/
├── 📄 server.js                 # Main server file
├── 📄 connectionWrapper.js      # TikTok connection handler
├── 📄 limiter.js               # Rate limiting
├── 📄 package.json             # Dependencies
├── 📁 public/                  # Frontend files
│   ├── 📄 index.html           # Setup interface
│   ├── 📄 overlay.html         # OBS overlay
│   ├── 📄 style.css            # Styles (legacy)
│   ├── 📄 app-overlay.js       # Overlay JavaScript
│   └── 📄 connection.js        # Socket.IO connection
├── 📄 start-server.bat         # Windows startup script
├── 📄 startup-silent.bat       # Silent startup script
├── 📄 setup-autostart.ps1      # PowerShell auto-start
├── 📄 install-service.bat      # Service installation
└── 📄 README.md               # This file
```

## 🔧 Troubleshooting

### Common Issues

**Server won't start**
- Check if Node.js is installed: `node --version`
- Verify port 8081 is available
- Run as Administrator if needed

**Can't connect to TikTok**
- Ensure the username is currently live streaming
- Check internet connection
- Try a different TikTok username
- Verify username doesn't have special characters

**OBS shows blank overlay**
- Refresh the Browser Source in OBS
- Check if server is running: `http://localhost:8081`
- Verify the URL includes the username parameter
- Check browser console for errors (F12)

**Overlay not updating**
- Ensure TikTok user is actively streaming
- Check server console for connection messages
- Refresh the browser source in OBS
- Verify the username is spelled correctly

### Performance Tips

- Keep overlay running during entire stream
- Use `startup-silent.bat` for automatic startup
- Monitor CPU usage if experiencing lag
- Close unnecessary browser tabs while streaming

### Debug Mode
Add `?debug=1` to the overlay URL for console logging:
```
http://localhost:8081/overlay?username=USERNAME&debug=1
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Code Style
- Use consistent indentation (2 spaces)
- Comment complex functions
- Follow existing naming conventions
- Test on multiple TikTok accounts

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This project uses the unofficial TikTok Live API through the [tiktok-live-connector](https://github.com/zerodytrash/TikTok-Live-Connector) library. It's intended for educational and personal use only. Please respect TikTok's terms of service and rate limits.

## 🙏 Acknowledgments

- [TikTok-Live-Connector](https://github.com/zerodytrash/TikTok-Live-Connector) - Core TikTok connectivity
- [Socket.IO](https://socket.io/) - Real-time communication
- [Express.js](https://expressjs.com/) - Web server framework
- [Font Awesome](https://fontawesome.com/) - Icons
- [Inter Font](https://rsms.me/inter/) - Typography

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Troubleshooting](#-troubleshooting) section
2. Search existing [Issues](https://github.com/yourusername/tiktok-live-overlay/issues)
3. Create a new issue with detailed information
4. Include your OS, Node.js version, and error messages

## 🔄 Updates

### Version 1.0.0
- Initial release
- Compact overlay design
- Auto-start functionality
- OBS Studio integration
- Real-time TikTok Live analytics

---

**⭐ If this project helped you, please consider giving it a star!**

**🎮 Happy Streaming!**
