const indicator = document.getElementById("indicator-ball");
const noteText = document.getElementById("note-display");

// Start listening as soon as the site loads
window.addEventListener("load", () => {
  startTuner();
});

async function startTuner() {
  // Nothing happens untill the system recognize a sound
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  // Allowing to process and analayze the sound, making sure it works on all  browsers
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();

  // Connecting the mic and the analyzer, saving the audio decimal number with 2048 sampales
  source.connect(analyser);
  analyser.fftSize = 2048;
  const buffer = new Float32Array(analyser.fftSize);

  
  function getPitch() {
    // Filling the buffer with the latest audio data from the mic and detecting the dominant frequency using auto-correlation
    analyser.getFloatTimeDomainData(buffer);
    const ac = autoCorrelate(buffer, audioContext.sampleRate);

    // If pitch is vaild update accordingly
    if (ac !== -1) {
      const note = frequencyToNote(ac);
      const cents = note.cents;

      // Show indicator
      indicator.style.opacity = "1";

      // Calculate indicator position
      const clamped = Math.max(-50, Math.min(50, cents)); // limit to -50/+50
      const percent = (clamped + 50) / 100; // normalize to [0, 1]
      indicator.style.left = `${percent * 100}%`;

      // Change ball color depending on tuning accuracy
      const greenZone = 5; // How close (in cents) is considered "in tune"
      if (Math.abs(cents) <= greenZone) {
        indicator.style.backgroundColor = "#4caf50"; // green
      } else {
        indicator.style.backgroundColor = "#f44336"; // red
      }

      // Display the note below the bar
      noteText.textContent = note.name;
    } else {
      indicator.style.opacity = "0";
      noteText.textContent = "--";
    }

    // Schedules the function to run again on the next screen update - gives real-time updates without freezing the page
    requestAnimationFrame(getPitch);
  }

  getPitch();
}

// Estimates the dominant frequency of audio represented as decimal number
function autoCorrelate(buffer, sampleRate) {
  let SIZE = buffer.length;
  let rms = 0;

  // Calculating root mean square (signal strength)
  for (let i = 0; i < SIZE; i++) {
    let val = buffer[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / SIZE);

  // Ignoring very quiet input (background noises)
  if (rms < 0.01) return -1;

  // Setting the start and end of the audio, cutting the quiet parts before and after
  let r1 = 0, r2 = SIZE - 1, threshold = 0.2;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buffer[i]) < threshold) {
      r1 = i;
      break;
    }
  }

  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buffer[SIZE - i]) < threshold) {
      r2 = SIZE - i;
      break;
    }
  }

  buffer = buffer.slice(r1, r2);
  SIZE = buffer.length;

  // Comparing the buffer to shifted (delayed) versions
  // Creates an array which holds the auto-correlation values *added explanation in README
  let c = new Array(SIZE).fill(0);
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE - i; j++) {
      c[i] = c[i] + buffer[j] * buffer[j + i];
    }
  }

  let d = 0;
  while (c[d] > c[d + 1]) d++;
  // Finding the first peak in the correlation — most likely period of repetition in the signal.
  let maxval = -1, maxpos = -1;
  for (let i = d; i < SIZE; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }

  if (maxpos === -1) return -1;

  // Parabolic interpolation (for smoother result) **added explanation in README
  let T0 = maxpos;
  let x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
  let a = (x1 + x3 - 2 * x2) / 2;
  let b = (x3 - x1) / 2;
  if (a) T0 = T0 - b / (2 * a);

  return sampleRate / T0;
}

function frequencyToNote(freq) {
  const A4 = 440;
  const SEMITONE = 12;

  const noteNames = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];

  let noteNum = Math.round(SEMITONE * Math.log2(freq / A4) + 57); // 57 = note number of A4
  let noteName = noteNames[noteNum % 12];
  let octave = Math.floor(noteNum / 12) - 1;

  let standardFreq = A4 * Math.pow(2, (noteNum - 57) / SEMITONE);
  let cents = 1200 * Math.log2(freq / standardFreq);

  return {
    name: `${noteName}${octave}`,
    cents: cents
  };
}