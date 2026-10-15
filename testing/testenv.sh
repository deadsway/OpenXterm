#!/usr/bin/env bash
# Wegwerf-Testserver für OpenXterm auf Linux (Cloud-Sitzung oder WSL).
#
#   SSH : 127.0.0.1:2222  Benutzer tester / Passwort tester   (OpenSSH)
#   RDP : 127.0.0.1:3389  Benutzer tester / Passwort tester   (xrdp, nur TLS, KEIN NLA)
#
# Nach dem RDP-Login erscheint ein Desktop mit einem Terminalfenster, in dem
# der Text OPENXTERM-RDP-TEST steht – daran erkennt man im Screenshot den Erfolg.
#
# NUR FÜR TESTS: feste Passwörter, selbstsignierte Zertifikate.
#
# Nutzung: bash testing/testenv.sh start|stop|status
# Pakete (installiert cloud/setup.sh): openssh-server xrdp xorgxrdp dbus-x11 xterm icewm x11-xserver-utils
set -euo pipefail

SUDO=""
[ "$(id -u)" -eq 0 ] || SUDO="sudo"

SSH_PORT=2222
STATE=/tmp/openxterm-testenv
mkdir -p "$STATE"

ensure_user() {
  if ! id tester >/dev/null 2>&1; then
    $SUDO useradd -m -s /bin/bash tester
  fi
  echo 'tester:tester' | $SUDO chpasswd
  # Einfache X-Sitzung für xrdp: Hintergrundfarbe + Terminal mit Erkennungstext
  $SUDO tee /home/tester/.xsession >/dev/null <<'EOF'
#!/bin/sh
xsetroot -solid "#1e6f5c"
xterm -geometry 80x20+40+40 -e sh -c "echo OPENXTERM-RDP-TEST; exec sh" &
exec icewm
EOF
  $SUDO chmod +x /home/tester/.xsession
  $SUDO chown tester:tester /home/tester/.xsession
}

start_ssh() {
  command -v /usr/sbin/sshd >/dev/null || { echo "openssh-server fehlt"; return 1; }
  [ -f "$STATE/ssh_host_ed25519_key" ] || ssh-keygen -q -t ed25519 -N '' -f "$STATE/ssh_host_ed25519_key"
  cat > "$STATE/sshd_config" <<EOF
Port $SSH_PORT
ListenAddress 127.0.0.1
HostKey $STATE/ssh_host_ed25519_key
PidFile $STATE/sshd.pid
PasswordAuthentication yes
KbdInteractiveAuthentication no
PermitRootLogin no
UsePAM yes
Subsystem sftp internal-sftp
EOF
  $SUDO mkdir -p /run/sshd
  if [ -f "$STATE/sshd.pid" ] && $SUDO kill -0 "$(cat "$STATE/sshd.pid")" 2>/dev/null; then
    echo "SSH läuft bereits"
  else
    $SUDO /usr/sbin/sshd -f "$STATE/sshd_config"
    echo "SSH gestartet auf 127.0.0.1:$SSH_PORT"
  fi
  # Fingerprint ausgeben – den muss der Host-Key-Dialog im Spike anzeigen
  ssh-keygen -lf "$STATE/ssh_host_ed25519_key.pub"
}

start_rdp() {
  command -v xrdp >/dev/null || { echo "xrdp fehlt"; return 1; }
  # xrdp kann kein NLA (CredSSP). TLS erzwingen, damit der Client sauber verhandelt.
  $SUDO sed -i 's/^security_layer=.*/security_layer=tls/' /etc/xrdp/xrdp.ini
  if pgrep -x xrdp >/dev/null; then
    echo "RDP läuft bereits"
  else
    $SUDO mkdir -p /var/run/xrdp
    $SUDO rm -f /var/run/xrdp/*.pid
    $SUDO xrdp-sesman
    $SUDO xrdp
    echo "RDP gestartet auf 0.0.0.0:3389 (TLS, ohne NLA)"
  fi
}

stop_all() {
  [ -f "$STATE/sshd.pid" ] && $SUDO kill "$(cat "$STATE/sshd.pid")" 2>/dev/null || true
  rm -f "$STATE/sshd.pid"
  $SUDO pkill -x xrdp 2>/dev/null || true
  $SUDO pkill -x xrdp-sesman 2>/dev/null || true
  $SUDO pkill -u tester 2>/dev/null || true
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    pgrep -x xrdp >/dev/null || pgrep -x xrdp-sesman >/dev/null || break
    sleep 0.5
  done
  echo "Testserver gestoppt"
}

port_open() { timeout 2 bash -c "echo > /dev/tcp/127.0.0.1/$1" 2>/dev/null; }

status() {
  port_open "$SSH_PORT" && echo "SSH  127.0.0.1:$SSH_PORT  bereit" || echo "SSH  127.0.0.1:$SSH_PORT  aus"
  port_open 3389        && echo "RDP  127.0.0.1:3389  bereit" || echo "RDP  127.0.0.1:3389  aus"
}

case "${1:-status}" in
  start)  ensure_user; start_ssh; start_rdp; sleep 2; status ;;
  stop)   stop_all ;;
  status) status ;;
  *)      echo "Nutzung: $0 start|stop|status"; exit 2 ;;
esac
