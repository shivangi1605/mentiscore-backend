function bookSession() {
  const slot = document.getElementById("slot").value;
  const msg = document.getElementById("message");

  if (!slot) {
    msg.innerText = "❌ Please select a slot";
    msg.style.color = "red";
    return;
  }

  // Later: send to backend API
  msg.innerText = "✅ Booking request sent to counselor";
  msg.style.color = "green";
}

function approve() {
  const status = document.getElementById("status");
  status.innerText = "✅ Session Approved";
  status.style.color = "green";
}
