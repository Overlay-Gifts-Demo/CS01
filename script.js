/* ======================================================
   JEWELS-AI | ULTRA FAST DRIVE AR ENGINE
   Optimized Version - Square 1:1 Mode
====================================================== */

const API_KEY = "AIzaSyC35sqqZA1YaxZ-F4PJaDqQpKBxPyMKOzw";
const FOLDER_ID = "1fDj4lVzWcrXJnIQnljrC4-_SBEEV1dlz";

/* ===============================
   OPTIMIZED CHROMA KEY SHADER
================================ */
AFRAME.registerShader('chromakey', {
  schema: {
    src: { type: 'map' },
    color: { type: 'color', default: '#00FF00' },
    threshold: { type: 'number', default: 0.3 },
    smoothness: { type: 'number', default: 0.05 }
  },

  init: function (data) {
    const videoTexture = new THREE.VideoTexture(data.src);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.generateMipmaps = false;
    videoTexture.format = THREE.RGBAFormat;

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tex: { value: videoTexture },
        keyColor: { value: new THREE.Color(data.color) },
        similarity: { value: data.threshold },
        smoothness: { value: data.smoothness }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tex;
        uniform vec3 keyColor;
        uniform float similarity;
        uniform float smoothness;
        varying vec2 vUv;
        void main() {
          vec4 videoColor = texture2D(tex, vUv);
          float diff = distance(videoColor.rgb, keyColor);
          float alpha = smoothstep(similarity, similarity + smoothness, diff);
          
          // UPDATED: Removed dToCenter logic to keep square corners
          if (alpha < 0.1) discard; 
          
          gl_FragColor = vec4(videoColor.rgb, alpha);
        }
      `,
      transparent: true
    });
  },

  update: function (data) {
    this.material.uniforms.similarity.value = data.threshold;
    this.material.uniforms.smoothness.value = data.smoothness;
    this.material.uniforms.keyColor.value = new THREE.Color(data.color);
  }
});

/* ===============================
   FAST DRIVE FETCH
================================ */
async function getLatestVideoId() {
  try {
    const cachedId = localStorage.getItem("latestVideoId");
    if (cachedId) return cachedId;

    const url = `https://www.googleapis.com/drive/v3/files?q='${FOLDER_ID}'+in+parents+and+mimeType+contains+'video/'&orderBy=modifiedTime desc&pageSize=1&fields=files(id)&key=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.files && data.files.length > 0) {
      const fileId = data.files[0].id;
      localStorage.setItem("latestVideoId", fileId);
      return fileId;
    }
    return null;
  } catch (error) {
    console.error("Drive Fetch Error:", error);
    return null;
  }
}

/* ===============================
   AR INTERACTION LOGIC
================================ */
window.addEventListener("load", async () => {
  const videoEl = document.querySelector("#driveVideo");
  const videoCircle = document.querySelector("#videoCircle"); // Now targeting the a-plane
  const target = document.querySelector("#target1");
  const toggleButton = document.querySelector("#toggleButton");
  const buttonsContainer = document.querySelector("#planButtons");
  const curtain = document.querySelector("#blackCurtain"); 
  const sceneEl = document.querySelector('a-scene');

  let isPlaying = false;
  let videoLoaded = false;

  // Continuously remove MindAR's internal UI elements until ready
  const uiKiller = setInterval(() => {
    const uiElements = document.querySelectorAll('[class^="mindar-ui"], [id^="mindar-ui"]');
    uiElements.forEach(el => {
      el.style.display = 'none';
      el.remove(); 
    });
  }, 100);

  // Transition from Black Curtain to AR Scene
  sceneEl.addEventListener("arReady", () => {
    if (curtain) {
      curtain.style.opacity = "0";
      setTimeout(() => {
        curtain.style.display = "none";
        clearInterval(uiKiller);
      }, 500);
    }
  });

  sceneEl.addEventListener("arError", () => {
    const loader = document.querySelector("#loader");
    if (loader) loader.innerText = "Camera Error. Please Refresh.";
    clearInterval(uiKiller);
  });

  videoEl.addEventListener('playing', () => {
    if (videoCircle) videoCircle.setAttribute('visible', 'true'); [cite: 4]
  });

  target.addEventListener("targetFound", async () => {
    buttonsContainer.style.display = "block";
    if (!videoLoaded) {
      const fileId = await getLatestVideoId();
      if (fileId) {
        videoEl.src = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${API_KEY}`;
        videoEl.load();
        videoLoaded = true;
      }
    }
  });

  target.addEventListener("targetLost", () => {
    buttonsContainer.style.display = "none";
    videoEl.pause();
    if (videoCircle) videoCircle.setAttribute('visible', 'false'); 
    isPlaying = false;
    toggleButton.textContent = "▶️ Play Video";
  });

  toggleButton.addEventListener("click", async () => {
    try {
      if (!isPlaying) {
        videoEl.muted = false; 
        videoEl.volume = 1.0; 
        await videoEl.play();
        toggleButton.textContent = "⏸ Pause Video";
        isPlaying = true;
      } else {
        videoEl.pause();
        toggleButton.textContent = "▶️ Play Video";
        isPlaying = false;
      }
    } catch (err) {
      console.error("Playback error:", err);
    }
  });
});

document.addEventListener("contextmenu", (e) => e.preventDefault());