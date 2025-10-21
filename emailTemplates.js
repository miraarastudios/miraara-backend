export function contactAdminTemplate({ name, email, phone, subject, message }) {
  return {
    html: `
    <div style="background:linear-gradient(180deg,#fff5fa,#ffe0ef); padding:30px; font-family:Poppins,sans-serif; color:#333;">
      <div style="max-width:700px;margin:auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.08);">
        <div style="background:linear-gradient(90deg,#ff79b0,#d63384);padding:30px;color:#fff;text-align:center;">
          <img src="https://miraarastudiosofficial.web.app/uploads/logo/logo.png" alt="Miraara" style="width:90px;margin:0 auto 10px;display:block"/>
          <h1 style="margin:0;font-size:20px;">New Contact Submission</h1>
          <p style="margin:6px 0 0;opacity:0.95;">Miraara • Art & Design</p>
        </div>
        <div style="padding:28px;font-size:15px;line-height:1.6;color:#333;">
          <p>Hello Miraara Team,</p>
          <p>Details from the contact form:</p>
          <table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:18px;">
            <tr><td style="padding:8px;font-weight:600;width:120px;">Name</td><td style="padding:8px;">${escapeHtml(name)}</td></tr>
            <tr><td style="padding:8px;font-weight:600;">Email</td><td style="padding:8px;">${escapeHtml(email)}</td></tr>
            <tr><td style="padding:8px;font-weight:600;">Phone</td><td style="padding:8px;">${escapeHtml(phone||"—")}</td></tr>
            <tr><td style="padding:8px;font-weight:600;">Subject</td><td style="padding:8px;">${escapeHtml(subject)}</td></tr>
          </table>
          <div style="background:#fff6fb;border-left:4px solid #ff99c8;padding:16px;border-radius:8px;">
            <p>${escapeHtml(message)}</p>
          </div>
          <p style="margin-top:22px;font-size:13px;color:#777;">Saved at: ${new Date().toLocaleString()}</p>
        </div>
        <div style="background:#faf5f8;padding:18px;text-align:center;font-size:13px;color:#777;">© ${new Date().getFullYear()} Miraara</div>
      </div>
    </div>
    `,
    text: `New contact from ${name}\nEmail: ${email}\nPhone: ${phone||"-"}\nSubject: ${subject}\nMessage: ${message}`,
  };
}

export function contactAutoReplyTemplate({ name }) {
  return {
    html: `
    <div style="background:#fff8fb;padding:30px;font-family:Poppins,sans-serif;color:#333;text-align:center;">
      <img src="https://miraarastudiosofficial.web.app/uploads/logo/logo.png" alt="Miraara" style="width:80px;margin-bottom:12px;"/>
      <h2 style="color:#d63384;">Thanks for reaching out, ${escapeHtml(name)} 💫</h2>
      <p>We’ve received your message and will reply within 1–2 business days.</p>
      <a href="https://miraara.in" style="background:linear-gradient(90deg,#ff77a9,#d63384);color:#fff;padding:10px 30px;border-radius:28px;text-decoration:none;font-weight:600;">Explore Miraara</a>
    </div>
    `,
    text: `Thanks for reaching out, ${name}! We'll reply within 1-2 business days.`,
  };
}

export function subscribeAdminTemplate({ email }) {
  return {
    html: `
    <div style="background:#fff9f6;padding:30px;font-family:Poppins,sans-serif;">
      <div style="max-width:600px;margin:auto;background:#fff;border-radius:16px;padding:20px;box-shadow:0 6px 18px rgba(0,0,0,0.06);text-align:center;">
        <img src="https://miraarastudiosofficial.web.app/uploads/logo/logo.png" alt="Miraara" style="width:60px;margin-bottom:12px;"/>
        <h3 style="color:#d63384;">New Subscriber</h3>
        <p>Email: ${escapeHtml(email)}</p>
        <p style="font-size:13px;color:#666;">Saved at: ${new Date().toLocaleString()}</p>
      </div>
    </div>
    `,
    text: `New subscriber: ${email}`,
  };
}

export function subscribeAutoReplyTemplate({ email }) {
  return {
    html: `
    <div style="background:#fff8fb;padding:30px;font-family:Poppins,sans-serif;text-align:center;">
      <img src="https://miraarastudiosofficial.web.app/uploads/logo/logo.png" alt="Miraara" style="width:70px;margin-bottom:10px;"/>
      <h2 style="color:#d63384;">Welcome to Miraara ✨</h2>
      <p>You're on the list — expect beautiful updates, exclusive previews, and offers.</p>
      <a href="https://miraara.in" style="background:linear-gradient(90deg,#ff77a9,#d63384);color:#fff;padding:10px 28px;border-radius:28px;text-decoration:none;font-weight:600;">Visit Miraara</a>
      <p style="font-size:13px;color:#888;margin-top:14px;">You can unsubscribe anytime.</p>
    </div>
    `,
    text: `Welcome to Miraara! You're on our subscriber list for updates and offers.`,
  };
}

// Utility: simple HTML escape
function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
