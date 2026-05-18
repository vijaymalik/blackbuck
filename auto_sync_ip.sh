#!/bin/bash

# auto_sync_ip.sh - Automatically detect and sync IP, and trigger Windows UAC to configure firewall and port proxy automatically!

echo "=========================================================="
echo "          Blackbuck Fleet Manager - Auto IP Sync          "
echo "=========================================================="

# 1. Detect WSL2 IP Address
WSL_IP=$(hostname -I | awk '{print $1}')
if [ -z "$WSL_IP" ]; then
    echo "❌ Error: Could not detect WSL2 IP."
    exit 1
fi
echo "✅ Detected WSL2 IP: $WSL_IP"

# 2. Detect Windows Wi-Fi / Local IP Address using PowerShell from inside WSL
echo "🔍 Detecting Windows Wi-Fi IP address..."
WINDOWS_IP=$(/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { \$_.IPAddress -notlike '127.*' -and \$_.IPAddress -notlike '172.*' -and \$_.IPAddress -notlike '169.254.*' } | Select-Object -ExpandProperty IPAddress" | tr -d '\r\n' | awk '{print $1}')

if [ -z "$WINDOWS_IP" ]; then
    echo "⚠️ Warning: Could not detect Windows Host IP automatically."
    echo "Please enter your Windows IPv4 Address manually (from ipconfig):"
    read -r WINDOWS_IP
fi

if [ -z "$WINDOWS_IP" ]; then
    echo "❌ Error: Windows IP is required."
    exit 1
fi

echo "✅ Detected Windows Host IP: $WINDOWS_IP"
echo "----------------------------------------------------------"

# 3. Update root .env file
if [ -f "/var/www/html/blackbuck/.env" ]; then
    echo "Updating root .env..."
    sed -i "s|APP_URL=http://.*:8002|APP_URL=http://$WINDOWS_IP:8002|g" /var/www/html/blackbuck/.env
    sed -i "s|VITE_API_URL=http://.*:8002/api/v1|VITE_API_URL=http://$WINDOWS_IP:8002/api/v1|g" /var/www/html/blackbuck/.env
else
    echo "⚠️ Warning: root .env file not found."
fi

# 4. Update admin-dashboard/.env file
if [ -f "/var/www/html/blackbuck/admin-dashboard/.env" ]; then
    echo "Updating admin-dashboard/.env..."
    sed -i "s|VITE_API_BASE_URL=http://.*:8002/api/v1/admin|VITE_API_BASE_URL=http://$WINDOWS_IP:8002/api/v1/admin|g" /var/www/html/blackbuck/admin-dashboard/.env
else
    echo "⚠️ Warning: admin-dashboard/.env file not found."
fi

# 5. Update driver-app/src/api/index.js file
if [ -f "/var/www/html/blackbuck/driver-app/src/api/index.js" ]; then
    echo "Updating driver-app/src/api/index.js..."
    sed -i "s|const API_BASE_URL = 'http://.*:8002/api/v1';|const API_BASE_URL = 'http://$WINDOWS_IP:8002/api/v1';|g" /var/www/html/blackbuck/driver-app/src/api/index.js
else
    echo "⚠️ Warning: driver-app/src/api/index.js file not found."
fi

# 6. Restart the Docker container to apply changes
echo "----------------------------------------------------------"
echo "Restarting Dashboard Container..."
docker restart fleet-dashboard > /dev/null 2>&1
echo "🚀 Dashboard restarted!"

# 7. Automatically execute Port Forwarding and Firewall Rule on Windows by requesting UAC elevation
echo "----------------------------------------------------------"
echo "🛡️  Configuring Windows Port Forwarding and Firewall..."
echo "👉 Look at your Windows Taskbar. A prompt (UAC) will ask for Admin permissions."
echo "👉 Click 'YES' to automatically configure your ports and firewall."

# Construct the elevated commands
COMMANDS="netsh interface portproxy add v4tov4 listenport=8002 listenaddress=0.0.0.0 connectport=8002 connectaddress=$WSL_IP; "
COMMANDS+="netsh interface portproxy add v4tov4 listenport=5173 listenaddress=0.0.0.0 connectport=5173 connectaddress=$WSL_IP; "
COMMANDS+="netsh interface portproxy add v4tov4 listenport=8081 listenaddress=0.0.0.0 connectport=8081 connectaddress=$WSL_IP; "
COMMANDS+="netsh advfirewall firewall add rule name=\"WSL Docker Access\" dir=in action=allow protocol=TCP localport=8002,5173,8081"

# Execute elevated PowerShell on the Windows host
/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe -Command "Start-Process powershell -ArgumentList '-NoProfile -WindowStyle Hidden -Command \"$COMMANDS\"' -Verb RunAs"

echo "✅ Automatic Port Bridging request sent!"
echo "=========================================================="
echo "                  🎉 SYNC COMPLETE 🎉                   "
echo "=========================================================="
echo ""
echo "Done! Access the dashboard from any device on your Wi-Fi using:"
echo "🔗 http://$WINDOWS_IP:5173"
echo ""
