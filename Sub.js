

<!-- Bootstrap JS -->    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>    <!-- Enhanced Submission Script with Visual Feedback --  
  <!-- Firebase App (Core) -->  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>  <!-- Firebase Realtime Database -->  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js"></script>    <script>  
    const firebaseConfig = {  
      apiKey: "AIzaSyBTmeDxIUhua52KDAoag23q9MuNEOQXYQg",  
      authDomain: "prediction-94bf9.firebaseapp.com",  
      databaseURL: "https://prediction-94bf9-default-rtdb.firebaseio.com",  
      projectId: "prediction-94bf9",  
      storageBucket: "prediction-94bf9.appspot.com",  
      messagingSenderId: "960123689722",  
      appId: "1:960123689722:web:ca9579625439ecf2478743",  
      measurementId: "G-MTDJTB6JXG"  
    };  
  
    firebase.initializeApp(firebaseConfig);  
    const db = firebase.database();  
  
    // DOM elements  
    const form = document.getElementById("subscribeForm");  
    const messageInput = document.getElementById("mpesaMessage");  
    const submitBtn = document.getElementById("submitBtn");  
    const statusIndicator = document.getElementById("status");  
    const progressContainer = document.getElementById("progressContainer");  
    const progressBar = document.getElementById("progressBar");  
    const countdownContainer = document.getElementById("countdownContainer");  
    const countdownElement = document.getElementById("countdown");  
      
    // State variables  
    let poller = null;  
    let submittedId = null;  
    let countdownInterval = null;  
  
    function extractMpesaCode(msg) {  
      const match = msg.trim().match(/^([A-Z0-9]{10})/);  
      return match ? match[1] : null;  
    }  
  
    function storeSubmission(id, code, message) {  
      localStorage.setItem("submissionId", id);  
      localStorage.setItem("submissionCode", code);  
      localStorage.setItem("submissionMessage", message);  
    }  
  
    function clearSubmission() {  
      localStorage.removeItem("submissionId");  
      localStorage.removeItem("submissionCode");  
      localStorage.removeItem("submissionMessage");  
    }  
  
    function updateStatus(type, message) {  
      statusIndicator.className = "status-indicator status-" + type;  
      statusIndicator.innerHTML = `  
        <i class="fas ${type === 'success' ? 'fa-check-circle' :   
                         type === 'error' ? 'fa-exclamation-circle' :   
                         'fa-info-circle'}"></i>  
        <span>${message}</span>  
      `;  
    }  
  
    function startProgressBar() {  
      progressContainer.style.display = "block";  
      let width = 0;  
      const interval = setInterval(() => {  
        if (width >= 100) {  
          clearInterval(interval);  
          return;  
        }  
        width++;  
        progressBar.style.width = width + "%";  
      }, 50);  
    }  
  
    function startCountdown(seconds) {
  const existingEndTime = localStorage.getItem('subscriptionCountdownEndTime');

  let endTime;
  if (existingEndTime) {
    endTime = parseInt(existingEndTime);
  } else {
    endTime = Date.now() + seconds * 1000;
    localStorage.setItem('subscriptionCountdownEndTime', endTime);
  }

  countdownContainer.classList.remove("d-none");

  function updateCountdown() {
    const now = Date.now();
    const timeLeft = Math.max(0, Math.floor((endTime - now) / 1000));

    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    countdownElement.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

    if (timeLeft <= 0) {
      clearInterval(countdownInterval);
      localStorage.removeItem('subscriptionCountdownEndTime');
      window.location.href = 'index.html';
    }
  }

  updateCountdown(); // Run immediately
  countdownInterval = setInterval(updateCountdown, 1000);
}
  
    function checkVerification(id) {  
      db.ref(`submissions/${id}`).once("value", snap => {  
        if (snap.exists()) {  
          const data = snap.val();  
          const verified = data.verified === true || data.verified === "true";  
  
          if (verified) {  
            clearInterval(poller);  
            updateStatus("success", "✅ Verified! Redirecting to premium access...");  
            clearSubmission();  
            startCountdown(5);  
          }  
        }  
      });  
    }  
  
    function resumeSubmission(id, code, message) {  
      submittedId = id;  
      messageInput.value = message;  
      messageInput.disabled = true;  
      submitBtn.disabled = true;  
        
      updateStatus("pending", "⏳ Message submitted - waiting for verification");  
      startProgressBar();  
        
      poller = setInterval(() => checkVerification(id), 3000);  
    }  
  
    // On load: check for existing submission  
    const savedId = localStorage.getItem("submissionId");  
    const savedCode = localStorage.getItem("submissionCode");  
    const savedMessage = localStorage.getItem("submissionMessage");  
  
    if (savedId && savedCode && savedMessage) {  
      resumeSubmission(savedId, savedCode, savedMessage);  
    } else {  
      updateStatus("pending", "ℹ️ Complete payment and paste M-PESA message");  
    }  
  
    // Submit form event handler  
    form.addEventListener("submit", function(e) {  
      e.preventDefault();  
  
      // Reset status  
      updateStatus("pending", "Processing your submission...");  
      progressContainer.style.display = "block";  
      startProgressBar();  
        
      // Check for existing submission  
      if (submittedId || localStorage.getItem("submissionId")) {  
        updateStatus("pending", "⏳ You've already submitted. Awaiting verification.");  
        return;  
      }  
  
      const message = messageInput.value.trim();  
      const code = extractMpesaCode(message);  
  
      // Validate input  
      if (!message || !code) {  
        updateStatus("error", "⚠️ Please enter a valid M-PESA message (must begin with transaction code)");  
        progressContainer.style.display = "none";  
        return;  
      }  
  
      // Check for duplicate submission  
      db.ref("submissions").orderByChild("code").equalTo(code).once("value", snapshot => {  
        if (snapshot.exists()) {  
          updateStatus("error", "⚠️ This M-PESA code has already been submitted");  
          progressContainer.style.display = "none";  
        } else {  
          const newRef = db.ref("submissions").push();  
          submittedId = newRef.key;  
  
          newRef.set({  
            code,  
            message,  
            verified: false,  
            timestamp: Date.now()  
          })  
          .then(() => {  
            storeSubmission(submittedId, code, message);  
            updateStatus("success", "✅ Message submitted successfully!");  
            messageInput.disabled = true;  
            submitBtn.disabled = true;  
              
            // Start polling  
            poller = setInterval(() => checkVerification(submittedId), 3000);  
          })  
          .catch(error => {  
            updateStatus("error", `⚠️ Error: ${error.message}`);  
            progressContainer.style.display = "none";  
          });  
        }  
      });  
    });  
      
    // Real-time feedback as user types  
    messageInput.addEventListener("input", function() {  
      if (this.value.trim().length > 20) {  
        updateStatus("pending", "Message ready for submission");  
      } else if (this.value.trim().length > 0) {  
        updateStatus("pending", "Enter full M-PESA message");  
      } else {  
        updateStatus("pending", "Waiting for message...");  
      }  
    });  
  
