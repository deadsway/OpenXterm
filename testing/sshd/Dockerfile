# Wegwerf-SSH-Server für lokale Tests unter Windows mit Docker Desktop.
# NUR FÜR TESTS: festes Passwort.
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssh-server \
 && rm -rf /var/lib/apt/lists/* \
 && useradd -m -s /bin/bash tester && echo 'tester:tester' | chpasswd \
 && mkdir -p /run/sshd \
 && printf '%s\n' 'PasswordAuthentication yes' 'KbdInteractiveAuthentication no' 'PermitRootLogin no' \
      > /etc/ssh/sshd_config.d/openxterm-test.conf

EXPOSE 22
CMD ["/usr/sbin/sshd", "-D", "-e"]
