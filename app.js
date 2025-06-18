const startButton = document.getElementById("start-button");
const freqDisplay = document.getElementById("frequency");
const noteDisplay = document.getElementById("note");
const offsetDisplay = document.getElementById("offset");

// When the button is clicked:
startButton.addEventListener("click", async () => {
  // Ask for microphone access
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  // Create an audio context (allows us to process sound)
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();

  // Convert microphone input into a source
  const source = audioContext.createMediaStreamSource(stream);

  // Create a tool that lets us analyze sound data
  const analyser = audioContext.createAnalyser();

  // Connect mic to the analyzer
  source.connect(analyser);
  analyser.fftSize = 2048; // Buffer size
  const buffer = new Float32Array(analyser.fftSize);

  // Function that runs again and again to update pitch
  function getPitch() {
    analyser.getFloatTimeDomainData(buffer); // Fill buffer with mic input

    const ac = autoCorrelate(buffer, audioContext.sampleRate); // ← pitch detection (coming soon)

    // If we got a valid pitch:
    if (ac !== -1) {
      freqDisplay.textContent = ac.toFixed(2); // Show frequency
      const note = frequencyToNote(ac);        // Match to musical note
      noteDisplay.textContent = note.name;
      offsetDisplay.textContent = note.cents.toFixed(1); // Cents off
    } else {
      // If pitch wasn't found, show --
      freqDisplay.textContent = '--';
      noteDisplay.textContent = '--';
      offsetDisplay.textContent = '--';
    }

    // Call this again on the next animation frame (real-time updates)
    requestAnimationFrame(getPitch);
  }

  // Start the loop
  getPitch();
});