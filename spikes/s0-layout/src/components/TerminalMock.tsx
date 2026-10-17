// Static terminal excerpt as a placeholder for xterm.js.
function Prompt() {
  return (
    <>
      <span className="t-green t-bold">admin@web-01</span>:<span className="t-blue t-bold">~</span>${" "}
    </>
  );
}

export function TerminalMock() {
  return (
    <pre className="terminal" aria-label="Terminal (Platzhalter)">
      <span className="t-muted">
        Verbunden mit web-01 (192.0.2.10:22) · Host-Schlüssel geprüft: ED25519 SHA256:q3Vx…7mKc
      </span>
      {"\n\n"}
      <Prompt />
      uptime{"\n"}
      {" 14:32:07 up 41 days,  3:12,  2 users,  load average: 0.08, 0.12, 0.10\n"}
      <Prompt />
      ls -l /var/www{"\n"}
      {"total 12\n"}
      {"drwxr-xr-x 5 www-data www-data 4096 Okt 12 09:41 "}
      <span className="t-blue t-bold">app</span>
      {"\n"}
      {"drwxr-xr-x 2 www-data www-data 4096 Sep 30 17:05 "}
      <span className="t-blue t-bold">backup</span>
      {"\n"}
      {"-rw-r--r-- 1 root     root      612 Aug  4 11:20 index.html\n"}
      <Prompt />
      systemctl status nginx --no-pager | head -3{"\n"}
      <span className="t-green">●</span>
      {" nginx.service - nginx web server\n"}
      {"     Loaded: loaded (/lib/systemd/system/nginx.service; "}
      <span className="t-green">enabled</span>
      {")\n"}
      {"     Active: "}
      <span className="t-green t-bold">active (running)</span>
      {" since Mon 2026-09-07 11:20:13 UTC; 5 weeks ago\n"}
      <Prompt />
      df -h /{"\n"}
      {"Filesystem      Size  Used Avail Use% Mounted on\n"}
      {"/dev/sda1        40G   31G  7.2G  "}
      <span className="t-yellow">82%</span>
      {" /\n"}
      <Prompt />
      <span className="t-cursor"> </span>
    </pre>
  );
}
