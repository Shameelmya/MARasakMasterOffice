# 🚀 MLA Office Local Server Setup Guide

This guide explains how to start the custom file server on your 1TB office computer and connect it to the internet securely using Cloudflare Tunnels, without opening any router ports!

## Step 1: Start the Local File Server
1. Open a Command Prompt or PowerShell window in the `file-server` folder of your project on the 1TB PC.
2. Run this command to install the necessary packages (you only need to do this once):
   ```bash
   npm install
   ```
3. Run this command to start the server:
   ```bash
   npm start
   ```
4. You should see a message saying **🚀 MLA Office Local File Server Running!** on port `4000`. Leave this black window open.

## Step 2: Set up Cloudflare Tunnels
Cloudflare Tunnels will safely punch a hole through your router so the Trivandrum staff can reach this computer without needing a static IP.

1. Download `cloudflared` for Windows:
   - Go to: https://github.com/cloudflare/cloudflared/releases/latest
   - Download `cloudflared-windows-amd64.exe`
2. Move that `.exe` file into your `file-server` folder and rename it to just `cloudflared.exe`.
3. Open a **NEW** Command Prompt window in the `file-server` folder (don't close the server running in Step 1).
4. Run this command to create the tunnel to your local port 4000:
   ```bash
   cloudflared tunnel --url http://localhost:4000
   ```

## Step 3: Connect Your React App
When you run the tunnel command, look closely at the output in the black window. You will see a URL that looks something like this:
👉 `https://random-words-here.trycloudflare.com`

This is your new permanent public URL for the file server!
1. Copy that URL.
2. Go to your **Vercel Dashboard** where your React app is hosted.
3. Go to **Settings > Environment Variables**.
4. Add a new variable:
   - **Key:** `VITE_UPLOAD_SERVER_URL`
   - **Value:** `https://random-words-here.trycloudflare.com`
5. Click Save, and trigger a **Redeploy** on Vercel.

**🎉 DONE!** Your live application is now routing all citizen document uploads straight into the 1TB hard drive in your office!

> **⚠️ CRITICAL REMINDER:** 
> Both black windows (the Node server and the Cloudflare Tunnel) must stay running on the office computer. Do not close them, and make sure the computer never goes to sleep!
