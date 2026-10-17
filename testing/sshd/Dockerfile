# Wegwerf-SSH-Server für lokale Tests unter Windows mit Docker Desktop.
# NUR FÜR TESTS: festes Passwort.
# vim-tiny, procps (top, ps), htop und mc wie beim Cloud-Testserver, für Terminaltests.
# vim-tiny bringt nur vi/vim.tiny mit, deshalb zusätzlich der Link /usr/local/bin/vim.
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssh-server vim-tiny procps htop mc \
 && rm -rf /var/lib/apt/lists/* \
 && ln -s /usr/bin/vim.tiny /usr/local/bin/vim \
 && useradd -m -s /bin/bash tester && echo 'tester:tester' | chpasswd \
 && mkdir -p /run/sshd \
 && printf '%s\n' 'PasswordAuthentication yes' 'KbdInteractiveAuthentication no' 'PermitRootLogin no' \
      > /etc/ssh/sshd_config.d/openxterm-test.conf

EXPOSE 22
CMD ["/usr/sbin/sshd", "-D", "-e"]
