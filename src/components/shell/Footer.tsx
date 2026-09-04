import { Headphones } from "lucide-react";

export function Footer() {
  return (
    <footer className="footer">
      <span className="footer-copy" dir="ltr">© 2026 Gold Label Studio Pro</span>
      <span className="footer-version">نسخه 1.0.0</span>
      <span className="footer-made">ساخته شده با <b>♥</b> برای صنعت طلا و جواهر</span>
      <button className="support-button"><Headphones size={18}/> پشتیبانی</button>
    </footer>
  );
}
