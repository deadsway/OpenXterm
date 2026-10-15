# Wegwerf-RDP-Server (xrdp) für lokale Tests unter Windows mit Docker Desktop.
# Gleiche Konfiguration wie testing/testenv.sh (dort in der Cloud geprüft).
# NUR FÜR TESTS: festes Passwort, selbstsigniertes Zertifikat.
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      xrdp xorgxrdp dbus-x11 xterm icewm x11-xserver-utils ssl-cert ca-certificates \
 && rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/bash tester && echo 'tester:tester' | chpasswd \
 && printf '%s\n' '#!/bin/sh' \
      'xsetroot -solid "#1e6f5c"' \
      'xterm -geometry 80x20+40+40 -e sh -c "echo OPENXTERM-RDP-TEST; exec sh" &' \
      'exec icewm' > /home/tester/.xsession \
 && chmod +x /home/tester/.xsession && chown tester:tester /home/tester/.xsession \
 && adduser xrdp ssl-cert \
 && sed -i 's/^security_layer=.*/security_layer=tls/' /etc/xrdp/xrdp.ini

EXPOSE 3389
CMD ["sh", "-c", "rm -f /var/run/xrdp/*.pid; mkdir -p /var/run/xrdp; xrdp-sesman && exec xrdp --nodaemon"]
